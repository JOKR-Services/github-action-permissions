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
    try {
        // Sometimes teams in CODEOWNERS files are in the form of: organization/team-name
        team = team.replace(/^\@/, '');
        const teamSplit = team.split('/');
        let owner = github.context.repo.owner;
        if (teamSplit.length > 1) {
            owner = teamSplit[0];
            team = teamSplit[1];
        }
        const teamMembers = await octokit.request('GET /orgs/{org}/teams/{teamSlug}/members', {
            org: owner,
            teamSlug: team
        })
        return teamMembers.data.map((member: any) => member.login);
    } catch (error: any) {
        core.warning('⚠️ Error getting team members ', error.message);
        return [];
    }
}

async function isUserAllowedByConfigFile(actor: string, configFile: string, workflow: string): Promise<boolean> {
    try {
        const file = await fs.readFile(configFile);
        const actions: ActionPermissions = JSON.parse(file.toString()).action_permissions;
        if (!actions) {
            core.warning('⚠️ Config file missing required property: action_permissions');
            return false;
        }

        for (const [actionName, allowedActors] of Object.entries(actions)) {
            if (actionName.toLowerCase() === workflow.toLowerCase()) {
                if (allowedActors.users && allowedActors.users.includes(actor)) {
                    return true;
                }

                if (!allowedActors.teams) return false;
                for (let team of allowedActors.teams) {
                    const members = await getTeamMembers(team);
                    if (members.includes(actor)) return true;
                }
                return false;
            }
        }
    } catch (e: any) {
        core.error(`Error occurred when loading config file ${e.toString()}`);
    }
    return false;
}

async function isUserAllowedByCodeowners(actor: string): Promise<boolean> {
    try {
        let file = null;
        const codeownerPaths = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']
        for (const codeownerPath of codeownerPaths) {
            try {
                file = await fs.readFile(codeownerPath);
                break;
            } catch (e) { }
        }
        if (!file) {
            core.warning('⚠️ CODEOWNERS not present in repository.');
            return false;
        }
        // Not checking for the exact action file that is running, because the filename is not the context
        const pathRegex = /^\*$|^\.github\/?\**$|^\.github\/workflows\/?\**$/g;
        const lines = file.toString().split(/\r\n|\r|\n/);
        for (const line of lines) {
            if (!line) continue;
            if (line.startsWith('#')) continue;
            const [pathString, ...ownersRaw] = line.split(/\s+/);
            const owners = ownersRaw.map(owner => owner.replace(/^\@/, ''));
            if (pathString.match(pathRegex)) {
                if (owners.includes(actor)) {
                    return true;
                }
                for (const team of owners) {
                    const members = await getTeamMembers(team);
                    if (members.includes(actor)) return true;
                }
            }
        }
    } catch (e: any) {
        core.warning(`⚠️ Error occurred when parsing CODEOWNERS file ${e.toString()}`);
    }
    return false;
}
async function main() {
    const { actor, workflow } = github.context;
    const configFile = core.getInput('config_file', { required: false }) ?? '.devops.config';
    let allowed = await isUserAllowedByConfigFile(actor, configFile, workflow);
    allowed ||= await isUserAllowedByCodeowners(actor);
    if (allowed) {
        core.info("✅ User allowed to run action");
        return;
    }

    core.setFailed(`❌ ${actor} is not allowed to run this workflow. Add the user or their team to the config file or CODEOWNERS.`);
}

main();
