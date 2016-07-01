/**
 * @Copyright (c) Microsoft Corporation.  All rights reserved.
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as rimraf from 'rimraf';
import * as tty from 'tty';

export default class Utilities {
  /**
   * For a scoped NPM package name this separates the scope and name parts.  For example:
   * parseScopedPackgeName('@my-scope/myproject') = { scope: '@my-scope', name: 'myproject' }
   * parseScopedPackgeName('myproject') = { scope: '', name: 'myproject' }
   */
  public static parseScopedPackgeName(scopedName: string): { scope: string, name: string } {
    if (scopedName.substr(0, 1) !== '@') {
      return { scope: '', name: scopedName };
    }

    const slashIndex: number = scopedName.indexOf('/');
    if (slashIndex >= 0) {
      return { scope: scopedName.substr(0, slashIndex), name: scopedName.substr(slashIndex + 1) };
    } else {
      throw new Error('Invalid scoped name: ' + scopedName);
    }
  }

  /**
   * NodeJS equivalent of performance.now().
   */
  public static getTimeInMs(): number {
    let seconds: number;
    let nanoseconds: number;
    [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  }

  public static createFolderWithRetry(folderName: string): void {
    // We need to do a simple "fs.mkdirSync(localModulesFolder)" here,
    // however if the folder we deleted above happened to contain any files,
    // then there seems to be some OS process (virus scanner?) that holds
    // a lock on the folder for a split second, which causes mkdirSync to
    // fail.  To workaround that, retry for up to 7 seconds before giving up.
    const maxWaitTimeMs: number = 7 * 1000;

    const startTime: number = Utilities.getTimeInMs();
    let looped: boolean = false;
    while (true) {
      try {
        fs.mkdirSync(folderName);
        break;
      } catch (e) {
        looped = true;
        const currentTime: number = Utilities.getTimeInMs();
        if (currentTime - startTime > maxWaitTimeMs) {
          throw new Error(e.message + os.EOL + 'Often this is caused by a file lock'
            + ' from a process such as your text editor, command prompt, or "gulp serve"');
        }
      }
    }
    if (looped) {
      const currentTime: number = Utilities.getTimeInMs();
      const totalSeconds: string = ((currentTime - startTime) / 1000.0).toFixed(2);
      console.log(`createFolderWithRetry() stalled for ${totalSeconds} seconds`);
    }
  }

  /**
   * BE VERY CAREFUL CALLING THIS FUNCTION!
   * If you specify the wrong folderPath (e.g. "/"), it could potentially delete your entire
   * hard disk.
   */
  public static dangerouslyDeletePath(folderPath: string): void {
    try {
      rimraf.sync(folderPath, { disableGlob: true });
    } catch (e) {
      throw new Error(e.message + os.EOL + 'Often this is caused by a file lock'
        + ' from a process such as your text editor, command prompt, or "gulp serve"');
    }
  }

  /*
   * Returns true if outputFilename has a more recent last modified timestamp
   * than all of the inputFilenames, which would imply that we don't need to rebuild it.
   * Returns false if any of the files does not exist.
   */
  public static isFileTimestampCurrent(outputFilename: string, inputFilenames: string[]): boolean {
    if (!fs.existsSync(outputFilename)) {
      return false;
    }
    const outputStats: fs.Stats = fs.statSync(outputFilename);

    for (const inputFilename of inputFilenames) {
      if (!fs.existsSync(inputFilename)) {
        return false;
      }

      const inputStats: fs.Stats = fs.statSync(inputFilename);
      if (outputStats.mtime < inputStats.mtime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns the width of the console, measured in columns
   */
  public static getConsoleWidth(): number {
    const stdout: tty.WriteStream = process.stdout as tty.WriteStream;
    if (stdout && stdout.columns) {
      return stdout.columns;
    }
    return 80;
  }

  /**
   * Executes the command with the specified command-line parameters, and waits for it to complete.
   * The current directory will be set to the specified workingDirectory.
   */
  public static executeCommand(command: string, args: string[], workingDirectory: string,
    suppressOutput: boolean = false): void {

    const options: child_process.SpawnSyncOptions = {
      cwd: workingDirectory,
      shell: true,
      stdio: suppressOutput ? undefined : [0, 1, 2]
    };

    let result: child_process.SpawnSyncReturns<Buffer> = child_process.spawnSync(command, args, options);

    /* tslint:disable:no-any */
    if ((result.error as any).errno === 'ENOENT') {
      // This is a workaround for GitHub issue #25330
      // https://github.com/nodejs/node-v0.x-archive/issues/25330
      result = child_process.spawnSync(command + '.cmd', args, options);
    }
    /* tslint:enable:no-any */

    if (result.error) {
      throw result.error;
    }
  }

  /**
   * Executes the command with the specified command-line parameters, and waits for it to complete.
   * The current directory will be set to the specified workingDirectory.
   */
  public static executeCommandAsync(command: string, args: string[], workingDirectory: string):
    child_process.ChildProcess {

    // This is a workaround for GitHub issue #25330.  It is not as complete as the workaround above,
    // but there doesn't seem to be an easy asynchronous solution.
    // https://github.com/nodejs/node-v0.x-archive/issues/25330
    if (fs.existsSync(command + '.cmd')) {
      command += '.cmd';
    }

    return child_process.spawn(command, args, {
      cwd: workingDirectory,
      shell: true
    });
  }
}
