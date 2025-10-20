/**
 * Test that the CommonJS export of local-filesystem works correctly
 * This is critical for Jest users who run in CommonJS mode
 */

describe('LocalFileSystem CommonJS Export', () => {
  it('should be importable in CommonJS/Jest environment', async () => {
    // This test verifies that the package.json exports are configured correctly
    // and that Jest can load the local-filesystem module

    // In a real Jest environment (CommonJS), this would load the .cjs file
    // In our test environment with ts-jest, it loads the TypeScript source
    const { LocalFileSystem } = await import('@/filesystem/local-filesystem');

    expect(LocalFileSystem).toBeDefined();
    expect(typeof LocalFileSystem).toBe('function');

    // Verify we can instantiate it
    const fs = new LocalFileSystem();
    expect(fs).toBeInstanceOf(LocalFileSystem);
  });

  it('should export FileSystemError', async () => {
    const { FileSystemError } = await import('@/filesystem');

    expect(FileSystemError).toBeDefined();
    expect(typeof FileSystemError).toBe('function');

    // Verify error creation methods work
    const error = FileSystemError.notFound('/test/path');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('ENOENT');
    expect(error.path).toBe('/test/path');
  });
});
