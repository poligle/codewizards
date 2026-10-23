export class Emitter {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    const list = this.map.get(name) || [];
    this.map.set(name, [...list, fn]);
    return () => this.off(name, fn);
  }
  once(name, fn) {
    const wrap = (...args) => { this.off(name, wrap); fn(...args); };
    return this.on(name, wrap);
  }
  off(name, fn) {
    const list = this.map.get(name) || [];
    const i = list.indexOf(fn);
    if (i >= 0) this.map.set(name, [...list.slice(0, i), ...list.slice(i + 1)]);
  }
  emit(name, ...args) {
    const list = this.map.get(name) || [];
    for (const fn of list) fn(...args);
    return list.length;
  }
}
