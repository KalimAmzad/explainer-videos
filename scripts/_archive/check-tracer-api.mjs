import * as mod from '@image-tracer-ts/nodejs';
console.log('Module exports:', Object.keys(mod));
const cls = mod.ImageTracerNodejs || mod.default;
if (cls) {
  console.log('Static methods:', Object.getOwnPropertyNames(cls).filter(n => typeof cls[n] === 'function'));
  if (cls.prototype) {
    const proto = Object.getOwnPropertyNames(cls.prototype).filter(n => n !== 'constructor');
    console.log('Instance methods:', proto);
  }
}
