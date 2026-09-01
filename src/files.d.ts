declare module "*.yaml" {
  const value: any; // Add type definitions here if desired
  export default value;
}

declare module "*.ttf" {
  const value: ArrayBuffer;
  export default value;
}

declare module "*.otf" {
  const value: ArrayBuffer;
  export default value;
}

declare module "*.png" {
  const value: ArrayBuffer;
  export default value;
}

declare module "*.wasm" {
  const value: any;
  export default value;
}
