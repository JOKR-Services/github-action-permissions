import * as core from '@actions/core';
import * as github from '@actions/github';
import { promises as fs } from 'fs';

async function isUserAllowedByConfigFile(actor: string, configFile: string) {
    try {
        const file = await fs.readFile(configFile);
        const actions = JSON.parse(file.toString()).action_permissions;
        if (!actions) {
            core.error('Config file missing required property: action_permissions');
        }
        // Check if action is present in the list
        // If yes, check if user is in the allow list
        
        // Otherwise
        return true;
    } catch (e: any) {
        core.error('Error occurred when loading config file ', e);
    }
    return false;
}

async function main() {
    const actor = github.context.actor;
    const configFile = core.getInput('config_file', { required: false }) ?? '.devops.config';
    let allowed = await isUserAllowedByConfigFile(actor, configFile);
    // allowed ||= await isUserAllowedByCodeowners(actor);
    console.log(github);
    if (allowed) {
        core.info("User allowed to run action");
        return;
    }

    core.setFailed(`${actor} is not allowed to run this workflow`)
}

main();
