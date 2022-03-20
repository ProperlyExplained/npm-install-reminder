const vscode = require('vscode');
const execSync = require('child_process').execSync;

let npmInstallReminderActivated = true;

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let checkPackageLock = true;
  let commitId;

  const execInWorkspace = command => execSync(command, { cwd: vscode.workspace.workspaceFolders[0].uri.fsPath }).toString();

  try {
    while(npmInstallReminderActivated) {
      if(checkPackageLock) {
        let output = execInWorkspace('git diff --name-only @ @{1}');
        if(output.split('\n').find(f => f.endsWith('package-lock.json'))) {
          checkPackageLock = false;
          commitId = execInWorkspace('git rev-parse HEAD').toString();
          let selection = await vscode.window.showInformationMessage(
            'A difference from the previous commit in the package-lock.json has been detected. Do you want to run "npm install"?',
            'Yes',
            'No'
          );
          if(selection == 'Yes') {
            await new Promise(resolve => {
              vscode.window.withProgress({
                title: 'Running npm install...',
                location: vscode.ProgressLocation.Notification
              }, async () => {
                execInWorkspace('npm install');
                resolve();
              });
            });
          }
        }
      } else {
        let output = execInWorkspace('git rev-parse HEAD').toString();
        if(commitId != output) {
          checkPackageLock = true;
        }
      }
      await sleep(1_000);
    }
  } catch(e) {
    vscode.window.showErrorMessage("An error has occurred. Please make sure you have git and npm installed, and that the project has git initialized and at least 2 commits. Then please restart this plugin by deactivating and reactivating it.");
    console.error(e);
  }
}

function deactivate() {
  npmInstallReminderActivated = false;
}

module.exports = {
  activate,
  deactivate
}
