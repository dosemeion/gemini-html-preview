(function() {
  var _NativeIO = window.IntersectionObserver;
  if (!_NativeIO) return;
  window.IntersectionObserver = function(cb, opts) {
    var io = new _NativeIO(cb, opts);
    var orig = io.observe.bind(io);
    io.observe = function(t) {
      orig(t);
      setTimeout(function() { cb([{ isIntersecting: true, target: t, intersectionRatio: 1 }], io); }, 0);
    };
    return io;
  };
  window.IntersectionObserver.prototype = _NativeIO.prototype;
})();
