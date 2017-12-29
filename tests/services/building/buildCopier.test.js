const JimpleMock = require('/tests/mocks/jimple.mock');

jest.mock('jimple', () => JimpleMock);
jest.mock('fs-extra');
jest.unmock('/src/services/building/buildCopier');

require('jasmine-expect');
const fs = require('fs-extra');
const { BuildCopier, buildCopier } = require('/src/services/building/buildCopier');

describe('services/building:buildCopier', () => {
  beforeEach(() => {
    fs.pathExistsSync.mockReset();
    fs.readJson.mockReset();
    fs.writeJson.mockReset();
    fs.ensureDir.mockReset();
    fs.readdir.mockReset();
  });

  it('should be instantiated with all its dependencies', () => {
    // Given
    const copier = 'copier';
    const appLogger = 'appLogger';
    const pathUtils = 'pathUtils';
    const projectConfiguration = 'projectConfiguration';
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    // Then
    expect(sut).toBeInstanceOf(BuildCopier);
    expect(sut.copier).toBe('copier');
    expect(sut.appLogger).toBe('appLogger');
    expect(sut.pathUtils).toBe('pathUtils');
    expect(sut.projectConfiguration).toBe('projectConfiguration');
  });

  it('should copy the project files', () => {
    // Given
    const copier = jest.fn((projectPath, buildPath, items) => Promise.resolve(
      items.map((item) => ({
        from: `${projectPath}/${item}`,
        to: `${buildPath}/${item}`,
        success: true,
      }))
    ));
    const appLogger = {
      success: jest.fn(),
      info: jest.fn(),
    };
    const pathUtils = {
      path: 'project-path',
      join: jest.fn((rest) => rest),
    };
    const projectConfiguration = {
      copy: [
        'fileA.js',
        'folderB',
      ],
      version: {
        revisionFilename: 'revision',
        copyRevision: true,
      },
      paths: {
        build: 'some-build',
        privateModules: 'private',
      },
    };
    const expectedItems = [
      ...projectConfiguration.copy,
      ...[projectConfiguration.version.revisionFilename],
    ];
    fs.pathExistsSync.mockImplementationOnce(() => true);
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    return sut.copyFiles()
    .then(() => {
      // Then
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(1);
      expect(fs.pathExistsSync)
      .toHaveBeenCalledWith(projectConfiguration.version.revisionFilename);
      expect(pathUtils.join).toHaveBeenCalledTimes(2);
      expect(pathUtils.join)
      .toHaveBeenCalledWith(projectConfiguration.version.revisionFilename);
      expect(pathUtils.join)
      .toHaveBeenCalledWith(projectConfiguration.paths.build);
      expect(copier).toHaveBeenCalledTimes(1);
      expect(copier).toHaveBeenCalledWith(
        pathUtils.path,
        projectConfiguration.paths.build,
        expectedItems
      );
      expect(appLogger.success).toHaveBeenCalledTimes(1);
      expect(appLogger.info).toHaveBeenCalledTimes(expectedItems.length);
    })
    .catch(() => {
      expect(true).toBeFalse();
    });
  });

  it('shouldn\'t copy the project files if the `copy` key is not an array', () => {
    // Given
    const copier = jest.fn();
    const appLogger = 'appLogger';
    const pathUtils = 'pathUtils';
    const projectConfiguration = {
      copy: null,
      version: {
        revisionFilename: 'revision',
        copyRevision: true,
      },
      paths: {
        build: 'some-build',
        privateModules: 'private',
      },
    };
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    return sut.copyFiles()
    .then(() => {
      expect(true).toBeFalse();
    })
    .catch((error) => {
      // Then
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatch(/is not an array/i);
      expect(copier).toHaveBeenCalledTimes(0);
    });
  });

  it('shouldn\'t copy anything if the `copy` array is empty', () => {
    // Given
    const copier = jest.fn();
    const appLogger = 'appLogger';
    const pathUtils = 'pathUtils';
    const projectConfiguration = {
      copy: [],
      version: {
        revisionFilename: 'revision',
        copyRevision: false,
      },
      paths: {
        build: 'some-build',
        privateModules: 'private',
      },
    };
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    return sut.copyFiles()
    .then(() => {
      // Then
      expect(copier).toHaveBeenCalledTimes(0);
    })
    .catch(() => {
      expect(true).toBeFalse();
    });
  });

  it('should copy a node module with the project files', () => {
    // Given
    const copier = jest.fn((projectPath, buildPath, items) => Promise.resolve(items.map((item) => {
      let result;
      if (typeof item === 'string') {
        result = {
          from: `${projectPath}/${item}`,
          to: `${buildPath}/${item}`,
          success: true,
        };
      } else {
        const [itemName] = Object.keys(item);
        result = {
          from: itemName,
          to: `${buildPath}/${item[itemName]}`,
          success: true,
        };
      }

      return result;
    })));
    const appLogger = {
      success: jest.fn(),
      info: jest.fn(),
    };
    const pathUtils = {
      path: 'project-path',
      join: jest.fn((rest) => rest),
    };
    const productionDependency = 'wootils';
    const developmentDependency = 'woopack-plugin-webpack';
    const modulesToCopy = [productionDependency, developmentDependency];
    const itemsToCopy = [
      'fileA.js',
      'folderB',
    ];
    const privateModulesFolder = 'private';
    const projectConfiguration = {
      copy: [
        ...itemsToCopy,
        ...modulesToCopy.map((mod) => `node_modules/${mod}`),
      ],
      version: {
        revisionFilename: 'revision',
        copyRevision: true,
      },
      paths: {
        build: 'some-build',
        privateModules: privateModulesFolder,
      },
    };
    const expectedItems = [
      ...itemsToCopy,
      ...modulesToCopy.map((mod) => ({
        [`node_modules/${mod}`]: `${privateModulesFolder}/${mod}`,
      })),
      ...[projectConfiguration.version.revisionFilename],
    ];
    fs.pathExistsSync.mockImplementationOnce(() => true);
    fs.readJson.mockImplementationOnce(() => Promise.resolve({
      dependencies: {
        [productionDependency]: 'latest',
      },
      devDependencies: {
        [developmentDependency]: 'latest',
      },
    }));
    fs.readJson.mockImplementationOnce(() => Promise.resolve({
      dependencies: {
        [productionDependency]: 'latest',
      },
    }));
    fs.readJson.mockImplementationOnce(() => Promise.resolve({
      devDependencies: {
        [developmentDependency]: 'latest',
      },
    }));
    fs.writeJson.mockImplementationOnce(() => Promise.resolve());
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    return sut.copyFiles()
    .then(() => {
      // Then
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(1);
      expect(fs.pathExistsSync)
      .toHaveBeenCalledWith(projectConfiguration.version.revisionFilename);

      expect(pathUtils.join).toHaveBeenCalledTimes(3);
      expect(pathUtils.join)
      .toHaveBeenCalledWith(projectConfiguration.version.revisionFilename);
      expect(pathUtils.join)
      .toHaveBeenCalledWith(projectConfiguration.paths.build);
      expect(pathUtils.join)
      .toHaveBeenCalledWith(projectConfiguration.paths.build, 'package.json');

      expect(copier).toHaveBeenCalledTimes(1);
      expect(copier).toHaveBeenCalledWith(
        pathUtils.path,
        projectConfiguration.paths.build,
        expectedItems
      );
      expect(appLogger.success).toHaveBeenCalledTimes(1);
      expect(appLogger.info).toHaveBeenCalledTimes(expectedItems.length);
    })
    .catch(() => {
      expect(true).toBeFalse();
    });
  });

  it('should fail to copy the project files', () => {
    // Given
    const error = new Error('Unknown error');
    const copier = jest.fn(() => Promise.reject(error));
    const appLogger = {
      error: jest.fn(),
    };
    const pathUtils = {
      path: 'project-path',
      join: jest.fn((rest) => rest),
    };
    const projectConfiguration = {
      copy: [
        'fileA.js',
        'folderB',
      ],
      version: {
        revisionFilename: 'revision',
        copyRevision: true,
      },
      paths: {
        build: 'some-build',
        privateModules: 'private',
      },
    };
    const expectedItems = [
      ...projectConfiguration.copy,
      ...[projectConfiguration.version.revisionFilename],
    ];
    fs.pathExistsSync.mockImplementationOnce(() => true);
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    return sut.copyFiles()
    .then(() => {
      expect(true).toBeFalse();
    })
    .catch((errorResult) => {
      // Then
      expect(fs.pathExistsSync).toHaveBeenCalledTimes(1);
      expect(fs.pathExistsSync)
      .toHaveBeenCalledWith(projectConfiguration.version.revisionFilename);
      expect(pathUtils.join).toHaveBeenCalledTimes(2);
      expect(pathUtils.join)
      .toHaveBeenCalledWith(projectConfiguration.version.revisionFilename);
      expect(pathUtils.join)
      .toHaveBeenCalledWith(projectConfiguration.paths.build);
      expect(copier).toHaveBeenCalledTimes(1);
      expect(copier).toHaveBeenCalledWith(
        pathUtils.path,
        projectConfiguration.paths.build,
        expectedItems
      );
      expect(appLogger.error).toHaveBeenCalledTimes(1);
      expect(errorResult).toBeInstanceOf(Error);
      expect(errorResult).toBe(error);
    });
  });

  it('should copy the project files', () => {
    // Given
    const copier = jest.fn(() => Promise.resolve());
    const appLogger = {
      success: jest.fn(),
    };
    const pathUtils = 'pathUtils';
    const projectConfiguration = 'projectConfiguration';
    const target = {
      paths: {
        build: 'target-build-path',
        source: 'target-source-path',
      },
    };
    const targetFiles = [
      'index.js',
      'start.js',
      'lib',
    ];
    fs.ensureDir.mockImplementationOnce(() => Promise.resolve());
    fs.readdir.mockImplementationOnce(() => Promise.resolve(targetFiles));
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    return sut.copyTargetFiles(target)
    .then(() => {
      // Then
      expect(fs.ensureDir).toHaveBeenCalledTimes(1);
      expect(fs.ensureDir).toHaveBeenCalledWith(target.paths.build);
      expect(fs.readdir).toHaveBeenCalledTimes(1);
      expect(fs.readdir).toHaveBeenCalledWith(target.paths.source);
      expect(copier).toHaveBeenCalledTimes(1);
      expect(copier).toHaveBeenCalledWith(target.paths.source, target.paths.build, targetFiles);
      expect(appLogger.success).toHaveBeenCalledTimes(1);
    })
    .catch(() => {
      expect(true).toBeFalse();
    });
  });

  it('should fail to copy the project files', () => {
    // Given
    const error = new Error('Unknown error');
    const copier = jest.fn(() => Promise.reject(error));
    const appLogger = {
      error: jest.fn(),
    };
    const pathUtils = 'pathUtils';
    const projectConfiguration = 'projectConfiguration';
    const target = {
      paths: {
        build: 'target-build-path',
        source: 'target-source-path',
      },
    };
    const targetFiles = [
      'index.js',
      'start.js',
      'lib',
    ];
    fs.ensureDir.mockImplementationOnce(() => Promise.resolve());
    fs.readdir.mockImplementationOnce(() => Promise.resolve(targetFiles));
    let sut = null;
    // When
    sut = new BuildCopier(copier, appLogger, pathUtils, projectConfiguration);
    return sut.copyTargetFiles(target)
    .then(() => {
      expect(true).toBeFalse();
    })
    .catch((errorResult) => {
      // Then
      expect(fs.ensureDir).toHaveBeenCalledTimes(1);
      expect(fs.ensureDir).toHaveBeenCalledWith(target.paths.build);
      expect(fs.readdir).toHaveBeenCalledTimes(1);
      expect(fs.readdir).toHaveBeenCalledWith(target.paths.source);
      expect(copier).toHaveBeenCalledTimes(1);
      expect(copier).toHaveBeenCalledWith(target.paths.source, target.paths.build, targetFiles);
      expect(appLogger.error).toHaveBeenCalledTimes(1);
      expect(errorResult).toBe(error);
    });
  });

  it('should include a provider for the DIC', () => {
    // Given
    let sut = null;
    const container = {
      set: jest.fn(),
      get: jest.fn(
        (service) => (
          service === 'projectConfiguration' ?
            { getConfig: () => service } :
            service
        )
      ),
    };
    let serviceName = null;
    let serviceFn = null;
    // When
    buildCopier(container);
    [[serviceName, serviceFn]] = container.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(serviceName).toBe('buildCopier');
    expect(serviceFn).toBeFunction();
    expect(sut).toBeInstanceOf(BuildCopier);
    expect(sut.appLogger).toBe('appLogger');
    expect(sut.copier).toBe('copier');
    expect(sut.pathUtils).toBe('pathUtils');
    expect(sut.projectConfiguration).toBe('projectConfiguration');
  });
});
