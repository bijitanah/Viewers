import { Exception } from 'handlebars';
import ExtensionManager from './ExtensionManager.js';
import MODULE_TYPES from './MODULE_TYPES.js';
import log from './../log.js';

jest.mock('./../log.js');

describe('ExtensionManager.js', () => {
  let extensionManager, commandsManager;

  beforeEach(() => {
    commandsManager = {
      createContext: jest.fn(),
      getContext: jest.fn(),
      registerCommand: jest.fn(),
    };
    extensionManager = new ExtensionManager({ commandsManager });
    log.warn.mockClear();
    jest.clearAllMocks();
  });

  it('creates a module namespace for each module type', () => {
    const moduleKeys = Object.keys(extensionManager.modules);
    const moduleTypeValues = Object.values(MODULE_TYPES);

    expect(moduleKeys.sort()).toEqual(moduleTypeValues.sort());
  });

  describe('registerExtensions()', () => {
    it('calls registerExtension() for each extension', () => {
      extensionManager.registerExtension = jest.fn();

      // SUT
      const fakeExtensions = [{ one: '1' }, { two: '2' }, { three: '3 ' }];
      extensionManager.registerExtensions(fakeExtensions);

      // Assert
      expect(extensionManager.registerExtension.mock.calls.length).toBe(3);
    });
  });

  describe('registerExtension()', () => {
    it('calls preRegistration() for extension', () => {
      // SUT
      const fakeExtension = { one: '1', preRegistration: jest.fn() };
      extensionManager.registerExtension(fakeExtension);

      // Assert
      expect(fakeExtension.preRegistration.mock.calls.length).toBe(1);
    });

    it('calls preRegistration() passing configuration along with servicesManager and commandsManager instances for extension', () => {
      const configuration = { config: 'Some configuration' };
      extensionManager._servicesManager = { services: { TestService: {} } };

      // SUT
      const fakeExtension = { one: '1', preRegistration: jest.fn() };
      extensionManager.registerExtension(fakeExtension, configuration);

      // Assert
      expect(fakeExtension.preRegistration.mock.calls[0][0]).toEqual({
        servicesManager: extensionManager._servicesManager,
        commandsManager: extensionManager._commandsManager,
        configuration,
      });
    });

    it('logs a warning if the extension is null or undefined', () => {
      const undefinedExtension = undefined;
      const nullExtension = null;

      extensionManager.registerExtension(undefinedExtension);
      extensionManager.registerExtension(nullExtension);

      expect(log.warn.mock.calls.length).toBe(2);
    });

    it('logs a warning if the extension does not have an id', () => {
      const extensionWithoutId = {};

      extensionManager.registerExtension(extensionWithoutId);

      expect(log.warn.mock.calls.length).toBe(1);
    });

    it('tracks which extensions have been registered', () => {
      const extension = {
        id: 'hello-world',
      };

      extensionManager.registerExtension(extension);

      expect(extensionManager.registeredExtensionIds).toContain(extension.id);
    });

    it('logs a warning if the extension has an id that has already been registered', () => {
      const extension = { id: 'hello-world' };
      extensionManager.registerExtension(extension);

      // SUT
      extensionManager.registerExtension(extension);

      expect(log.warn.mock.calls.length).toBe(1);
    });

    it('logs a warning if a defined module returns null or undefined', () => {
      const extensionWithBadModule = {
        id: 'hello-world',
        getViewportModule: () => {
          return null;
        },
      };

      extensionManager.registerExtension(extensionWithBadModule);

      expect(log.warn.mock.calls.length).toBe(1);
      expect(log.warn.mock.calls[0][0]).toContain(
        'Null or undefined returned when registering'
      );
    });

    it('logs an error if an exception is thrown while retrieving a module', () => {
      const extensionWithBadModule = {
        id: 'hello-world',
        getViewportModule: () => {
          throw new Exception('Hello World');
        },
      };

      extensionManager.registerExtension(extensionWithBadModule);

      expect(log.error.mock.calls.length).toBe(1);
      expect(log.error.mock.calls[0][0]).toContain(
        'Exception thrown while trying to call'
      );
    });

    it('successfully passes a servicesManager and commandsManager instances to each module', () => {
      extensionManager._servicesManager = { services: { TestService: {} } };

      const extension = {
        id: 'hello-world',
        getViewportModule: jest.fn(),
        getSopClassHandlerModule: jest.fn(),
        getPanelModule: jest.fn(),
        getToolbarModule: jest.fn(),
        getCommandsModule: jest.fn(),
      };

      extensionManager.registerExtension(extension);

      expect(extension.getViewportModule.mock.calls[0][0]).toEqual({
        servicesManager: extensionManager._servicesManager,
        commandsManager: extensionManager._commandsManager,
      });
    });

    it('successfully registers a module for each module type', () => {
      const extension = {
        id: 'hello-world',
        getViewportModule: () => {
          return {};
        },
        getSopClassHandlerModule: () => {
          return {};
        },
        getPanelModule: () => {
          return {};
        },
        getToolbarModule: () => {
          return {};
        },
        getCommandsModule: () => {
          return {};
        },
      };

      extensionManager.registerExtension(extension);

      // Registers 1 module per module type
      Object.keys(extensionManager.modules).forEach(moduleType => {
        const modulesForType = extensionManager.modules[moduleType];

        expect(modulesForType.length).toBe(1);
      });
    });

    it('calls commandsManager.registerCommand for each commandsModule command definition', () => {
      const extension = {
        id: 'hello-world',
        getCommandsModule: () => {
          return {
            definitions: {
              exampleDefinition: {
                commandFn: () => {},
                storeContexts: [],
                options: {},
              },
            },
          };
        },
      };

      // SUT
      extensionManager.registerExtension(extension);

      expect(commandsManager.registerCommand.mock.calls.length).toBe(1);
    });

    it('logs a warning if the commandsModule contains no command definitions', () => {
      const extension = {
        id: 'hello-world',
        getCommandsModule: () => {
          return {};
        },
      };

      // SUT
      extensionManager.registerExtension(extension);

      expect(log.warn.mock.calls.length).toBe(1);
      expect(log.warn.mock.calls[0][0]).toContain(
        'Commands Module contains no command definitions'
      );
    });
  });
});
