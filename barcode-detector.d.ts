// Minimal types for the Barcode Detector API (not included in all TS DOM libs).
// See: https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API

export {};

declare global {
  interface BarcodeDetectorOptions {
    formats?: string[];
  }

  interface DetectedBarcode {
    rawValue?: string;
  }

  class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions);
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
    static getSupportedFormats(): Promise<string[]>;
  }
}

