const JimpleMock = require('/tests/mocks/jimple.mock');

jest.mock('jimple', () => JimpleMock);
jest.mock('@babel/core');
jest.mock('fs');
jest.mock('glob');
jest.mock('fs-extra');
jest.unmock('/src/services/building/buildTranspiler');

const path = require('path');
const babel = require('@babel/core');
const glob = require('glob');
const fs = require('fs-extra');
require('jasmine-expect');
const {
  BuildTranspiler,
  buildTranspiler,
} = require('/src/services/building/buildTranspiler');

describe('services/building:buildTranspiler', () => {
  const toJS = (file) => file.replace(/\.[jt]sx?$/i, '.js');

  beforeEach(() => {
    fs.writeFile.mockReset();
    fs.pathExists.mockReset();
    fs.remove.mockReset();
    fs.writeFileSync.mockReset();
    fs.pathExistsSync.mockReset();
    fs.removeSync.mockReset();
    babel.transformFile.mockReset();
    babel.transformFileSync.mockReset();
    glob.mockReset();
  });

  it('should be instantiated with all its dependencies', () => {
    // Given
    const babelConfiguration = 'babelConfiguration';
    const appLogger = 'appLogger';
    const targets = 'targets';
    const utils = 'utils';
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    // Then
    expect(sut).toBeInstanceOf(BuildTranspiler);
    expect(sut.babelConfiguration).toBe(babelConfiguration);
    expect(sut.appLogger).toBe(appLogger);
    expect(sut.targets).toBe(targets);
    expect(sut.utils).toBe(utils);
  });

  it('should transpile a target files', () => {
    // Given
    const code = 'module.exports = someFunction();';
    const jsxFile = 'fileB.jsx';
    const files = [
      'fileA.js',
      jsxFile,
    ];
    glob.mockImplementationOnce((pattern, options, fn) => {
      fn(null, files);
    });
    files.forEach(() => {
      babel.transformFile.mockImplementationOnce((from, options, fn) => {
        fn(null, { code });
      });
    });
    fs.pathExists.mockImplementationOnce(() => true);
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = {
      success: jest.fn(),
      info: jest.fn(),
    };
    const targets = 'targets';
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    const target = {
      paths: {
        build: '/some-absolute-path/to-the/build/directory',
      },
      folders: {
        build: 'build/directory',
      },
      includeTargets: [],
      sourceMap: {
        development: false,
        production: true,
      },
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileTargetFiles(target)
    .then(() => {
      // Then
      expect(glob).toHaveBeenCalledTimes(1);
      expect(glob).toHaveBeenCalledWith(
        '**/*.{js,jsx,ts,tsx}',
        {
          cwd: target.paths.build,
        },
        expect.any(Function)
      );
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
      expect(utils.ensureExtension).toHaveBeenCalledTimes(files.length);
      expect(babel.transformFile).toHaveBeenCalledTimes(files.length);
      expect(fs.writeFile).toHaveBeenCalledTimes(files.length);
      files.forEach((file) => {
        expect(babel.transformFile).toHaveBeenCalledWith(
          path.join(target.paths.build, file),
          {},
          expect.any(Function)
        );
        expect(fs.writeFile).toHaveBeenCalledWith(
          path.join(target.paths.build, toJS(file)),
          code
        );
        expect(utils.ensureExtension).toHaveBeenCalledWith(
          path.join(target.paths.build, file)
        );
      });

      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(path.join(target.paths.build, jsxFile));
      expect(fs.remove).toHaveBeenCalledTimes(1);
      expect(fs.remove).toHaveBeenCalledWith(path.join(target.paths.build, jsxFile));
      expect(appLogger.success).toHaveBeenCalledTimes(1);
      expect(appLogger.info).toHaveBeenCalledTimes(files.length);
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should transpile a target files and avoid already transpiled .ts files', () => {
    // Given
    const code = 'module.exports = someFunction();';
    const filename = 'fileX';
    const jsFile = `${filename}.js`;
    const tsFile = `${filename}.ts`;
    const files = [
      jsFile,
      tsFile,
    ];
    glob.mockImplementationOnce((pattern, options, fn) => {
      fn(null, files);
    });
    files.forEach(() => {
      babel.transformFile.mockImplementationOnce((from, options, fn) => {
        fn(null, { code });
      });
    });
    fs.pathExists.mockImplementationOnce(() => true);
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = {
      success: jest.fn(),
      info: jest.fn(),
    };
    const targets = 'targets';
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    const target = {
      paths: {
        build: '/some-absolute-path/to-the/build/directory',
      },
      folders: {
        build: 'build/directory',
      },
      includeTargets: [],
      sourceMap: {
        development: false,
        production: true,
      },
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileTargetFiles(target)
    .then(() => {
      // Then
      expect(glob).toHaveBeenCalledTimes(1);
      expect(glob).toHaveBeenCalledWith(
        '**/*.{js,jsx,ts,tsx}',
        {
          cwd: target.paths.build,
        },
        expect.any(Function)
      );
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
      expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
      expect(utils.ensureExtension).toHaveBeenCalledWith(
        path.join(target.paths.build, tsFile)
      );
      expect(babel.transformFile).toHaveBeenCalledTimes(1);
      expect(babel.transformFile).toHaveBeenCalledWith(
        path.join(target.paths.build, tsFile),
        {},
        expect.any(Function)
      );
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(target.paths.build, jsFile),
        code
      );
      expect(fs.remove).toHaveBeenCalledTimes(1);
      expect(fs.remove).toHaveBeenCalledWith(path.join(target.paths.build, tsFile));
      expect(appLogger.success).toHaveBeenCalledTimes(1);
      expect(appLogger.info).toHaveBeenCalledTimes(1);
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should transpile a target and its `includeTargets` files', () => {
    // Given
    const code = 'module.exports = someFunction();';
    const files = [
      'fileA.js',
      'fileB.jsx',
    ];
    glob.mockImplementationOnce((pattern, options, fn) => {
      fn(null, files);
    });
    glob.mockImplementationOnce((pattern, options, fn) => {
      fn(null, files);
    });
    files.forEach(() => {
      babel.transformFile.mockImplementationOnce((from, options, fn) => {
        fn(null, { code });
      });
      babel.transformFile.mockImplementationOnce((from, options, fn) => {
        fn(null, { code });
      });
    });
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = {
      success: jest.fn(),
      info: jest.fn(),
    };
    const includedTarget = {
      name: 'included-target',
      paths: {
        build: 'included-target-build-path',
        source: 'included-target-source-path',
      },
      folders: {
        build: 'other/build/directory',
      },
      includeTargets: [],
      sourceMap: {
        development: true,
        production: true,
      },
    };
    const targets = {
      getTarget: jest.fn(() => includedTarget),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    const target = {
      paths: {
        build: '/some-absolute-path/to-the/build/directory',
      },
      folders: {
        build: 'build/directory',
      },
      includeTargets: [includedTarget.name],
      sourceMap: {
        development: true,
        production: false,
      },
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileTargetFiles(target)
    .then(() => {
      // Then
      expect(glob).toHaveBeenCalledTimes(2);
      expect(glob).toHaveBeenCalledWith(
        '**/*.{js,jsx,ts,tsx}',
        {
          cwd: target.paths.build,
        },
        expect.any(Function)
      );
      expect(glob).toHaveBeenCalledWith(
        '**/*.{js,jsx,ts,tsx}',
        {
          cwd: includedTarget.paths.build,
        },
        expect.any(Function)
      );
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(2);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(includedTarget);
      expect(utils.ensureExtension).toHaveBeenCalledTimes(files.length * 2);
      expect(babel.transformFile).toHaveBeenCalledTimes(files.length * 2);
      expect(fs.writeFile).toHaveBeenCalledTimes(files.length * 2);
      files.forEach((file) => {
        expect(utils.ensureExtension).toHaveBeenCalledWith(
          path.join(target.paths.build, file)
        );
        expect(babel.transformFile).toHaveBeenCalledWith(
          path.join(target.paths.build, file),
          { sourceMaps: true },
          expect.any(Function)
        );
        expect(fs.writeFile).toHaveBeenCalledWith(
          path.join(target.paths.build, toJS(file)),
          code
        );
        expect(babel.transformFile).toHaveBeenCalledWith(
          path.join(includedTarget.paths.build, file),
          { sourceMaps: true },
          expect.any(Function)
        );
        expect(fs.writeFile).toHaveBeenCalledWith(
          path.join(includedTarget.paths.build, toJS(file)),
          code
        );
      });

      expect(appLogger.success).toHaveBeenCalledTimes(2);
      expect(appLogger.info).toHaveBeenCalledTimes(files.length * 2);
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should fail to transpile a target files', () => {
    // Given
    const error = new Error('Unknown error');
    glob.mockImplementationOnce((pattern, options, fn) => {
      fn(error, []);
    });
    const babelConfiguration = 'babelConfiguration';
    const appLogger = {
      error: jest.fn(),
    };
    const targets = 'targets';
    const utils = 'utils';
    const target = {
      paths: {
        build: '/some-absolute-path/to-the/build/directory',
      },
      folders: {
        build: 'build/directory',
      },
      includeTargets: [],
      sourceMap: {
        development: false,
        production: true,
      },
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileTargetFiles(target)
    .then(() => {
      expect(true).toBeFalse();
    })
    .catch((errorResult) => {
      // Then
      expect(glob).toHaveBeenCalledTimes(1);
      expect(glob).toHaveBeenCalledWith(
        '**/*.{js,jsx,ts,tsx}',
        {
          cwd: target.paths.build,
        },
        expect.any(Function)
      );

      expect(appLogger.error).toHaveBeenCalledTimes(1);
      expect(errorResult).toBe(error);
    });
  });

  it('should fail to transpile a target that includes one that requires bundling', () => {
    // Given
    const babelConfiguration = 'babelConfiguration';
    const appLogger = 'appLogger';
    const includedTarget = {
      bundle: true,
      name: 'included-target',
      paths: {
        build: 'included-target-build-path',
        source: 'included-target-source-path',
      },
      folders: {
        build: 'other/build/directory',
      },
      includeTargets: [],
      sourceMap: {
        development: false,
        production: true,
      },
    };
    const targets = {
      getTarget: jest.fn(() => includedTarget),
    };
    const utils = 'utils';
    const target = {
      paths: {
        build: '/some-absolute-path/to-the/build/directory',
      },
      folders: {
        build: 'build/directory',
      },
      includeTargets: [includedTarget.name],
      sourceMap: {
        development: false,
        production: true,
      },
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileTargetFiles(target)
    .then(() => {
      expect(true).toBeFalse();
    })
    .catch((errorResult) => {
      // Then
      expect(glob).toHaveBeenCalledTimes(0);
      expect(errorResult).toBeInstanceOf(Error);
      expect(errorResult.message).toMatch(/requires bundling/i);
    });
  });

  it('should transpile a file', () => {
    // Given
    const code = 'module.exports = something();';
    const file = 'someFile.js';
    babel.transformFile.mockImplementationOnce((from, options, fn) => {
      fn(null, { code });
    });
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileFile(file)
    .then(() => {
      // Then
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
      expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
      expect(utils.ensureExtension).toHaveBeenCalledWith(file);
      expect(babel.transformFile).toHaveBeenCalledTimes(1);
      expect(babel.transformFile).toHaveBeenCalledWith(
        file,
        {},
        expect.any(Function)
      );
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(file, code);
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should transpile a file with a source map', () => {
    // Given
    const file = 'someFile.js';
    const mapFile = `${file}.map`;
    const mapLink = `//# sourceMappingURL=${mapFile}`;
    const code = 'module.exports = something();';
    const map = { version: 3, sources: [] };
    babel.transformFile.mockImplementationOnce((from, options, fn) => {
      fn(null, { code, map });
    });
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: true,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileFile(file, 'production')
    .then(() => {
      // Then
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
      expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
      expect(utils.ensureExtension).toHaveBeenCalledWith(file);
      expect(babel.transformFile).toHaveBeenCalledTimes(1);
      expect(babel.transformFile).toHaveBeenCalledWith(
        file,
        {
          sourceMaps: true,
        },
        expect.any(Function)
      );
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalledWith(file, `${code}\n${mapLink}\n`);
      expect(fs.writeFile).toHaveBeenCalledWith(mapFile, JSON.stringify(map));
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should transpile a file to a different path', () => {
    // Given
    const code = 'module.exports = something();';
    const file = 'someFile.js';
    const newFile = 'someNewFile.js';
    babel.transformFile.mockImplementationOnce((from, options, fn) => {
      fn(null, { code });
    });
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileFile({
      source: file,
      output: newFile,
    })
    .then(() => {
      // Then
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
      expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
      expect(utils.ensureExtension).toHaveBeenCalledWith(newFile);
      expect(babel.transformFile).toHaveBeenCalledTimes(1);
      expect(babel.transformFile).toHaveBeenCalledWith(
        file,
        {},
        expect.any(Function)
      );
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(newFile, code);
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should transpile a file and return the code instead of writing it', () => {
    // Given
    const code = 'module.exports = something();';
    const file = 'someFile.js';
    babel.transformFile.mockImplementationOnce((from, options, fn) => {
      fn(null, { code });
    });
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileFile(file, 'development', {}, false)
    .then((result) => {
      // Then
      expect(result).toEqual({
        filepath: file,
        code,
      });
      expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
      expect(utils.ensureExtension).toHaveBeenCalledWith(file);
      expect(babel.transformFile).toHaveBeenCalledTimes(1);
      expect(babel.transformFile).toHaveBeenCalledWith(
        file,
        {},
        expect.any(Function)
      );
      expect(fs.writeFile).toHaveBeenCalledTimes(0);
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should fail to transpile a file', () => {
    // Given
    const file = 'someFile.js';
    const error = new Error('Unknown error');
    babel.transformFile.mockImplementationOnce((from, options, fn) => {
      fn(error, null);
    });
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    return sut.transpileFile(file)
    .then(() => {
      expect(true).toBeFalse();
    })
    .catch((resultError) => {
      // Then
      expect(resultError).toBe(error);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
      expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
      expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
      expect(utils.ensureExtension).toHaveBeenCalledWith(file);
      expect(babel.transformFile).toHaveBeenCalledTimes(1);
      expect(babel.transformFile).toHaveBeenCalledWith(
        file,
        {},
        expect.any(Function)
      );
    });
  });

  it('should transpile a file (sync)', () => {
    // Given
    const code = 'module.exports = something();';
    const file = 'someFile.js';
    babel.transformFileSync.mockImplementationOnce(() => ({ code }));
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    sut.transpileFileSync(file);
    // Then
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
    expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
    expect(utils.ensureExtension).toHaveBeenCalledWith(file);
    expect(babel.transformFileSync).toHaveBeenCalledTimes(1);
    expect(babel.transformFileSync).toHaveBeenCalledWith(file, {});
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(file, code);
  });

  it('should transpile a file with a source map (sync)', () => {
    // Given
    const file = 'someFile.js';
    const mapFile = `${file}.map`;
    const mapLink = `//# sourceMappingURL=${mapFile}`;
    const code = 'module.exports = something();';
    const map = { version: 3, sources: [] };
    babel.transformFileSync.mockImplementationOnce(() => ({ code, map }));
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: true,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    sut.transpileFileSync(file, 'production');
    // Then
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
    expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
    expect(utils.ensureExtension).toHaveBeenCalledWith(file);
    expect(babel.transformFileSync).toHaveBeenCalledTimes(1);
    expect(babel.transformFileSync).toHaveBeenCalledWith(file, { sourceMaps: true });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toHaveBeenCalledWith(file, `${code}\n${mapLink}\n`);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mapFile, JSON.stringify(map));
  });

  it('should transpile a JSX file (sync) and then remove the source', () => {
    // Given
    const code = 'module.exports = something();';
    const file = 'someFile.jsx';
    babel.transformFileSync.mockImplementationOnce(() => ({ code }));
    fs.pathExistsSync.mockImplementationOnce(() => true);
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    sut.transpileFileSync(file);
    // Then
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
    expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
    expect(utils.ensureExtension).toHaveBeenCalledWith(file);
    expect(babel.transformFileSync).toHaveBeenCalledTimes(1);
    expect(babel.transformFileSync).toHaveBeenCalledWith(file, {});
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(toJS(file), code);
    expect(fs.pathExistsSync).toHaveBeenCalledTimes(1);
    expect(fs.pathExistsSync).toHaveBeenCalledWith(file);
    expect(fs.removeSync).toHaveBeenCalledTimes(1);
    expect(fs.removeSync).toHaveBeenCalledWith(file);
  });

  it('should transpile a file to a different path (sync)', () => {
    // Given
    const code = 'module.exports = something();';
    const file = 'someFile.js';
    const newFile = 'someNewFile.js';
    babel.transformFileSync.mockImplementationOnce(() => ({ code }));
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    sut.transpileFileSync({
      source: file,
      output: newFile,
    });
    // Then
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
    expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
    expect(utils.ensureExtension).toHaveBeenCalledWith(newFile);
    expect(babel.transformFileSync).toHaveBeenCalledTimes(1);
    expect(babel.transformFileSync).toHaveBeenCalledWith(file, {});
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(newFile, code);
  });

  it('should transpile a file and return the code instead of writing it (sync)', () => {
    // Given
    const code = 'module.exports = something();';
    const file = 'someFile.js';
    babel.transformFileSync.mockImplementationOnce(() => ({ code }));
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: false,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = {
      ensureExtension: jest.fn((filepath) => toJS(filepath)),
    };
    let sut = null;
    let result = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    result = sut.transpileFileSync(file, 'development', {}, false);
    // Then
    expect(result).toEqual({
      filepath: file,
      code,
    });
    expect(utils.ensureExtension).toHaveBeenCalledTimes(1);
    expect(utils.ensureExtension).toHaveBeenCalledWith(file);
    expect(babel.transformFileSync).toHaveBeenCalledTimes(1);
    expect(babel.transformFileSync).toHaveBeenCalledWith(file, {});
    expect(fs.writeFileSync).toHaveBeenCalledTimes(0);
  });

  it('should enable source maps on a Babel configuration for a target', () => {
    // Given
    const file = 'someFile.js';
    const babelConfiguration = {
      getConfigForTarget: jest.fn(() => ({})),
    };
    const appLogger = 'appLogger';
    const target = {
      name: 'some-target',
      sourceMap: {
        development: true,
        production: false,
      },
    };
    const targets = {
      findTargetForFile: jest.fn(() => target),
    };
    const utils = 'utils';
    let sut = null;
    let result = null;
    // When
    sut = new BuildTranspiler(
      babelConfiguration,
      appLogger,
      targets,
      utils
    );
    result = sut.getTargetConfigurationForFile(file);
    // Then
    expect(result).toEqual({
      sourceMaps: true,
    });
    expect(targets.findTargetForFile).toHaveBeenCalledTimes(1);
    expect(targets.findTargetForFile).toHaveBeenCalledWith(file);
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledTimes(1);
    expect(babelConfiguration.getConfigForTarget).toHaveBeenCalledWith(target);
  });

  it('should include a provider for the DIC', () => {
    // Given
    let sut = null;
    const container = {
      set: jest.fn(),
      get: jest.fn((service) => service),
    };
    let serviceName = null;
    let serviceFn = null;
    // When
    buildTranspiler(container);
    [[serviceName, serviceFn]] = container.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(serviceName).toBe('buildTranspiler');
    expect(serviceFn).toBeFunction();
    expect(sut).toBeInstanceOf(BuildTranspiler);
    expect(sut.babelConfiguration).toBe('babelConfiguration');
    expect(sut.appLogger).toBe('appLogger');
    expect(sut.targets).toBe('targets');
    expect(sut.utils).toBe('utils');
  });
});
