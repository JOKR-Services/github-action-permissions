import * as core from '@actions/core';
import * as github from '@actions/github';
import { promises as fs } from 'fs';
import { Octokit } from "@octokit/action";

const octokit = new Octokit();
interface ActionPermissions {
    [name: string]: {
        users?: string[];
        teams?: string[];
    };
}

async function getTeamMembers(team: string): Promise<string[]> {
    const teamMembers = await octokit.request('GET /orgs/{org}/teams/{teamSlug}/members', {
        org: github.context.repo.owner,
        teamSlug: team
    })
    return teamMembers.data.map((member: any) => member.login);
}

async function isUserAllowedByConfigFile(actor: string, configFile: string, workflow: string) {
    try {
        const file = await fs.readFile(configFile);
        const actions = JSON.parse(file.toString()).action_permissions as ActionPermissions;
        if (!actions) {
            core.error('Config file missing required property: action_permissions');
        }

        for (const [actionName, allowedActors] of Object.entries(actions)) {
            if (actionName.toLowerCase() === workflow.toLowerCase()) {
                if (allowedActors.users && allowedActors.users.includes(actor)) {
                    return true;
                }
                
                if (!allowedActors.teams) return false;
                for (let team of allowedActors.teams) {
                    const members = await getTeamMembers(team);
                    console.log(members);
                    if(members.includes(actor)) return true;
                }
                return false;
            }
        }

        // If the action is not in the config file, then the user is allowed
        return true;
    } catch (e: any) {
        core.error('Error occurred when loading config file ', e);
    }
    return false;
}

async function main() {
    const { actor, workflow } = github.context;
    const configFile = core.getInput('config_file', { required: false }) ?? '.devops.config';
    let allowed = await isUserAllowedByConfigFile(actor, configFile, workflow);
    // allowed ||= await isUserAllowedByCodeowners(actor);
    console.log(github);
    if (allowed) {
        core.info("User allowed to run action");
        return;
    }

    core.setFailed(`${actor} is not allowed to run this workflow`);
}

main();
