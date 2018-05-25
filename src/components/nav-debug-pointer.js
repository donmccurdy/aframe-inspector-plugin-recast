/* global AFRAME */

module.exports = AFRAME.registerComponent('nav-debug-pointer', {
  init: function () {
    const el = this.el;
    const sceneEl = el.sceneEl;
    el.addEventListener('click', function (e) {
      const playerEl = sceneEl.querySelector('[movement-controls]');
      const controls = playerEl.components['movement-controls'];
      playerEl.setAttribute('position', e.detail.intersection.point);
      controls.updateNavLocation();
    });
    el.addEventListener('mouseenter', () => el.setAttribute('material', 'color', 'green'));
    el.addEventListener('mouseleave', () => el.setAttribute('material', 'color', 'crimson'));
  }
});
