/**
 * @jest-environment jsdom
 */

/*
 * Unit tests for the webcam gesture mode (game/src/movement.js and the
 * WebcamInput controller in game/src/mk.js). They run under jsdom, which has
 * no real camera or 2D canvas, so getUserMedia and getContext are stubbed.
 */

var FRAME_INTERVAL = 1000 / 5; // matches Movement.constants.FRAME_RATE

function fake2dContext() {
  // a tiny all-black 4x3 frame keeps the pixel-loop filters fast in tests
  return {
    drawImage: jest.fn(),
    putImageData: jest.fn(),
    getImageData: jest.fn(function () {
      return { data: new Uint8ClampedArray(4 * 3 * 4), width: 4, height: 3 };
    })
  };
}

function loadMovement() {
  jest.isolateModules(function () {
    require('../../game/src/movement.js');
  });
  return window.Movement;
}

function flushPromises() {
  // drain the microtask queue so getUserMedia's then/catch handlers run
  return Promise.resolve()
    .then(function () {})
    .then(function () {})
    .then(function () {});
}

describe('movement.js webcam capture', function () {
  var container;

  beforeEach(function () {
    document.body.innerHTML = '<div id="webcam-parent"></div>';
    container = document.getElementById('webcam-parent');

    // jsdom does not implement these media/canvas APIs
    jest.spyOn(window, 'alert').mockImplementation(function () {});
    jest.spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(function () {});
    jest.spyOn(window.HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function () {
        if (!this._fakeCtx) {
          this._fakeCtx = fake2dContext();
        }
        return this._fakeCtx;
      });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get: function () { return this._srcObject; },
      set: function (value) { this._srcObject = value; }
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: { getUserMedia: jest.fn() }
    });
  });

  afterEach(function () {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('places the processed canvas inside the given container', function () {
    navigator.mediaDevices.getUserMedia.mockReturnValue(new Promise(function () {}));
    var Movement = loadMovement();

    Movement.init({ container: container });

    var canvas = container.querySelector('#movementjs-main-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas.width).toBe(Movement.constants.WIDTH);
    expect(canvas.height).toBe(Movement.constants.HEIGHT);
    expect(canvas.style.position).not.toBe('absolute');
  });

  test('falls back to an absolutely positioned canvas on body without a container', function () {
    navigator.mediaDevices.getUserMedia.mockReturnValue(new Promise(function () {}));
    var Movement = loadMovement();

    Movement.init({});

    var canvas = document.body.querySelector('#movementjs-main-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas.parentNode).toBe(document.body);
    expect(canvas.style.position).toBe('absolute');
  });

  test('creates a hidden, muted, inline video element for capture', function () {
    navigator.mediaDevices.getUserMedia.mockReturnValue(new Promise(function () {}));
    var Movement = loadMovement();

    Movement.init({ container: container });

    var video = document.body.querySelector('video');
    expect(video).not.toBeNull();
    expect(video.style.visibility).toBe('hidden');
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
  });

  test('alerts when mediaDevices is unavailable (insecure context)', function () {
    navigator.mediaDevices = undefined;
    var Movement = loadMovement();

    Movement.init({ container: container });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('HTTPS'));
  });

  test('attaches the stream and starts processing when permission is granted', async function () {
    var stream = { id: 'fake-stream' };
    navigator.mediaDevices.getUserMedia.mockResolvedValue(stream);
    jest.useFakeTimers();
    var Movement = loadMovement();

    Movement.init({ container: container });
    await flushPromises();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    var video = document.body.querySelector('video');
    expect(video.srcObject).toBe(stream);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
  });

  test('alerts "Access forbidden" when camera permission is denied', async function () {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('denied'));
    var Movement = loadMovement();

    Movement.init({ container: container });
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Access forbidden');
  });

  test('skips frames until the video stream is ready', async function () {
    navigator.mediaDevices.getUserMedia.mockResolvedValue({ id: 'fake-stream' });
    jest.useFakeTimers();
    var Movement = loadMovement();

    Movement.init({ container: container });
    await flushPromises();

    var video = document.body.querySelector('video');
    var ctx = container.querySelector('#movementjs-main-canvas').getContext('2d');
    ctx.putImageData.mockClear();

    // readyState is 0 (HAVE_NOTHING) in jsdom: frames must be ignored
    jest.advanceTimersByTime(FRAME_INTERVAL);
    expect(ctx.putImageData).not.toHaveBeenCalled();

    // once the stream reports data, the first frame calibrates the background
    Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
    jest.advanceTimersByTime(FRAME_INTERVAL);

    var draw = window.HTMLCanvasElement.prototype.getContext
      .mock.results[0].value;
    expect(draw).toBeDefined();
  });

  test('captures the background on the first ready frame, scaled to the processing size', async function () {
    navigator.mediaDevices.getUserMedia.mockResolvedValue({ id: 'fake-stream' });
    jest.useFakeTimers();
    var Movement = loadMovement();

    Movement.init({ container: container });
    await flushPromises();

    var video = document.body.querySelector('video');
    Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
    jest.advanceTimersByTime(FRAME_INTERVAL);

    // getPixels must draw the video scaled to the 400x300 processing canvas
    var drawCalls = [];
    window.HTMLCanvasElement.prototype.getContext.mock.results.forEach(function (r) {
      r.value.drawImage.mock.calls.forEach(function (call) {
        drawCalls.push(call);
      });
    });
    var scaledVideoDraw = drawCalls.find(function (call) {
      return call[0] === video && call[3] === Movement.constants.WIDTH &&
        call[4] === Movement.constants.HEIGHT;
    });
    expect(scaledVideoDraw).toBeDefined();
  });

  test('reports an empty scene through the callbacks once motion settles', async function () {
    navigator.mediaDevices.getUserMedia.mockResolvedValue({ id: 'fake-stream' });
    jest.useFakeTimers();
    var Movement = loadMovement();
    var movementChanged = jest.fn();
    var positionChanged = jest.fn();

    Movement.init({
      container: container,
      movementChanged: movementChanged,
      positionChanged: positionChanged
    });
    await flushPromises();

    var video = document.body.querySelector('video');
    Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });

    // 1 background frame + 1 priming frame + MIN_FRAMES_WITHOUT_MOTION still
    // frames before the recognizer starts reporting
    var frames = Movement.constants.MIN_FRAMES_WITHOUT_MOTION + 3;
    jest.advanceTimersByTime(frames * FRAME_INTERVAL);

    expect(movementChanged).toHaveBeenCalledWith(Movement.movements.EMPTY);
    expect(positionChanged).toHaveBeenCalledWith(Movement.positions.EMPTY);
  });
});

describe('mk.js WebcamInput controller', function () {
  var mk;
  var container;

  beforeAll(function () {
    require('../../game/src/movement.js');
    require('../../game/src/mk.js');
    mk = window.mk;
  });

  beforeEach(function () {
    document.body.innerHTML = '<div id="webcam-parent"></div>';
    container = document.getElementById('webcam-parent');
  });

  afterEach(function () {
    jest.restoreAllMocks();
  });

  function makeWebcamInput(options) {
    // Basic's constructor builds a full arena/fighters setup, which is out of
    // scope here: stub it so only WebcamInput's own constructor logic runs.
    var originalBasic = mk.controllers.Basic;
    mk.controllers.Basic = function () {};
    try {
      return new mk.controllers.WebcamInput(options);
    } finally {
      mk.controllers.Basic = originalBasic;
    }
  }

  test('stores the webcam options from the game options', function () {
    var controller = makeWebcamInput({ webcam: { container: container } });
    expect(controller._webcam.container).toBe(container);
  });

  test('defaults webcam options to an empty object', function () {
    var controller = makeWebcamInput({});
    expect(controller._webcam).toEqual({});
  });

  test('passes the configured container through to Movement.init', function () {
    var initSpy = jest.spyOn(window.Movement, 'init').mockImplementation(function () {});
    var controller = makeWebcamInput({ webcam: { container: container } });
    controller.fighters = [{
      getMove: function () { return { type: mk.moves.types.STAND }; },
      setMove: jest.fn()
    }];

    controller._addMovementHandlers();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy.mock.calls[0][0].container).toBe(container);
  });

  test('moves the fighter when a gesture is recognized', function () {
    var capturedOptions;
    jest.spyOn(window.Movement, 'init').mockImplementation(function (options) {
      capturedOptions = options;
    });
    var fighter = {
      getMove: function () { return { type: mk.moves.types.STAND }; },
      setMove: jest.fn()
    };
    var controller = makeWebcamInput({ webcam: { container: container } });
    controller._player = 1;
    controller.fighters = [fighter, fighter];

    controller._addMovementHandlers();
    capturedOptions.movementChanged(window.Movement.movements.LEFT_ARM_UP);
    capturedOptions.positionChanged(window.Movement.positions.MIDDLE);

    expect(fighter.setMove).toHaveBeenCalledWith(mk.moves.types.HIGH_PUNCH);
    expect(fighter.setMove).toHaveBeenCalledWith(mk.moves.types.STAND);
  });
});
