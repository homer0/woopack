const { provider } = require('jimple');
const CLICommand = require('../../abstracts/cliCommand');
/**
 * This is a fake command the app uses to show the information of the build task. In reality, this
 * command is handled by a shell script.
 * @extends {CLICommand}
 */
class CLIBuildCommand extends CLICommand {
  /**
   * Class constructor.
   */
  constructor() {
    super();
    /**
     * The instruction needed to trigger the command.
     * @type {string}
     */
    this.command = 'build [target]';
    /**
     * A description of the command for the help interface.
     * @type {string}
     */
    this.description = 'Build a target';
    this.addOption(
      'type',
      '-t, --type [type]',
      'Which build type: development (default) or production',
      'development'
    );
    this.addOption(
      'run',
      '-r, --run',
      'Run the target after the build is completed. It only works when the ' +
        'build type is development',
      false
    );
    this.addOption(
      'watch',
      '-w, --watch',
      'Rebuild the target every time one of its files changes. It only works ' +
        'when the build type is development',
      false
    );
    this.addOption(
      'inspect',
      '-i, --inspect',
      'Enables the Node inspector. It only works with Node targets',
      false
    );
    this.addOption(
      'analyze',
      '-a, --analyze',
      'Enables the bundle analyzer. It only works with targets with bundling',
      false
    );
    /**
     * Enable unknown options so other services can customize the build command.
     * @type {boolean}
     */
    this.allowUnknownOptions = true;
  }
}
/**
 * The service provider that once registered on the app container will set an instance of
 * `CLIBuildCommand` as the `cliBuildCommand` service.
 * @example
 * // Register it on the container
 * container.register(cliBuildCommand);
 * // Getting access to the service instance
 * const cliBuildCommand = container.get('cliBuildCommand');
 * @type {Provider}
 */
const cliBuildCommand = provider((app) => {
  app.set('cliBuildCommand', () => new CLIBuildCommand());
});

module.exports = {
  CLIBuildCommand,
  cliBuildCommand,
};
