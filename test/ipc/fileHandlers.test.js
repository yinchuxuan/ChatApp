/**
 * Tests for main.js IPC Handlers - PDF and DOCX Document Operations
 */

const electronMock = require('electron');
const mockFs = require('fs');

require('../../main');

describe('PDF Document IPC Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.readFileSync.mockReturnValue(Buffer.from('%PDF-1.4 test pdf content'));
    mockFs.statSync.mockReturnValue({ size: 1024, mtime: new Date() });
  });

  describe('read-pdf-document handler', () => {
    test('should read PDF file as base64 successfully', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test pdf content');
      mockFs.readFileSync.mockReturnValue(pdfBuffer);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-pdf-document'];

      const result = await handler({}, 'sample.pdf');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.path).toContain('sample.pdf');
      expect(result.size).toBe(1024);
    });

    test('should handle PDF read error', async () => {
      mockFs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-pdf-document'];

      const result = await handler({}, 'missing.pdf');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    test('should return correct base64 encoding', async () => {
      const testBuffer = Buffer.from('test content');
      mockFs.readFileSync.mockReturnValue(testBuffer);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-pdf-document'];

      const result = await handler({}, 'test.pdf');
      expect(result.success).toBe(true);
      expect(result.data).toBe(testBuffer.toString('base64'));
    });

    test('should include file metadata', async () => {
      const testDate = new Date('2024-06-15T10:30:00');
      mockFs.readFileSync.mockReturnValue(Buffer.from('pdf data'));
      mockFs.statSync.mockReturnValue({ size: 2048, mtime: testDate });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-pdf-document'];

      const result = await handler({}, 'report.pdf');
      expect(result.success).toBe(true);
      expect(result.size).toBe(2048);
      expect(result.modified).toBe(testDate);
    });
  });
});

describe('DOCX Document IPC Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.readFileSync.mockReturnValue(Buffer.from('PK\x03\x04 test docx content'));
    mockFs.statSync.mockReturnValue({ size: 2048, mtime: new Date() });
  });

  describe('read-docx-document handler', () => {
    test('should read DOCX file as base64 successfully', async () => {
      const docxBuffer = Buffer.from('PK\x03\x04 test docx content');
      mockFs.readFileSync.mockReturnValue(docxBuffer);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-docx-document'];

      const result = await handler({}, 'sample.docx');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.path).toContain('sample.docx');
      expect(result.size).toBe(2048);
    });

    test('should handle DOCX read error', async () => {
      mockFs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-docx-document'];

      const result = await handler({}, 'missing.docx');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    test('should return correct base64 encoding', async () => {
      const testBuffer = Buffer.from('test docx content');
      mockFs.readFileSync.mockReturnValue(testBuffer);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-docx-document'];

      const result = await handler({}, 'test.docx');
      expect(result.success).toBe(true);
      expect(result.data).toBe(testBuffer.toString('base64'));
    });

    test('should include file metadata', async () => {
      const testDate = new Date('2024-06-15T10:30:00');
      mockFs.readFileSync.mockReturnValue(Buffer.from('docx data'));
      mockFs.statSync.mockReturnValue({ size: 5120, mtime: testDate });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-docx-document'];

      const result = await handler({}, 'report.docx');
      expect(result.success).toBe(true);
      expect(result.size).toBe(5120);
      expect(result.modified).toBe(testDate);
    });
  });
});

describe('Image Document IPC Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.readFileSync.mockReturnValue(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
    mockFs.statSync.mockReturnValue({ size: 5120, mtime: new Date() });
  });

  describe('read-image-document handler', () => {
    test('should read JPG file as base64 successfully', async () => {
      const imageBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      mockFs.readFileSync.mockReturnValue(imageBuffer);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-image-document'];

      const result = await handler({}, 'sample.jpg');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.path).toContain('sample.jpg');
    });

    test('should read PNG file with correct mime type', async () => {
      mockFs.readFileSync.mockReturnValue(Buffer.from('test png content'));

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-image-document'];

      const result = await handler({}, 'image.png');
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    test('should handle image read error', async () => {
      mockFs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-image-document'];

      const result = await handler({}, 'missing.jpg');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });
});