const vscode = require('vscode');
const execSync = require('child_process').execSync;

async function activate() {

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let checkPackageLock = true;
  let commitId;

  const throwsException = f => { try { f(); } catch(e) { return true; } return false; };

  const getCommandsNotPresent = programs => programs.map(program =>  [program, throwsException(() => execSync(`${program} --version`))]);

  const unavailableCommands = getCommandsNotPresent(['git', 'npm']).filter(([,isNotAvailable]) => isNotAvailable);
  if(unavailableCommands.length) {
    unavailableCommands.forEach(([program]) => {
      vscode.window.showErrorMessage(`Couldn't execute ${program}. Please check it can be found in the PATH environment variable and has the correct permissions. Then restart VSCode.`);
    });
    return;
  }

  const execInWorkspace = command => execSync(command, { cwd: vscode.workspace.workspaceFolders[0].uri.fsPath }).toString();

  if(throwsException(() => execInWorkspace('git status'))) {
    vscode.window.showErrorMessage('No git repository detected. Please run "git init" or "git clone <repo>". Then restart VSCode.');
    return;
  }

  while(true) {
    try {
      if(checkPackageLock) {
        let output = execInWorkspace('git diff --name-only HEAD HEAD@{1}');
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
    } catch(e) {
      console.error(e);
    }
  }
}

module.exports = { activate };
