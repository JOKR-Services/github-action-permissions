# Github Action Permissions
Add this action into your workflow to specify the exact actors who can run that workflow.

It supports listing the users or teams in a JSON configuration file and if the actor is not found there, it will check the CODEOWNERS file as well. If the user that triggered the action (or their team) is not on the list of allowed actors, the run will fail.

Basic usage:
```yaml
      - uses: JOKR-Services/github-action-permissions@main
        with:
          token: "${{ secrets.GITHUB_TOKEN }}"
```
Specify a version of the action:
```yaml
      - uses: JOKR-Services/github-action-permissions@v0.1.1
        with:
          token: "${{ secrets.GITHUB_TOKEN }}"
```

**❕Important**: The default `GITHUB_TOKEN` does not have organizational-level access, so it will not be able to retrieve the team members. If you wish to use teams for setting up permissions, a personal access token (PAT) or a different token with access to `members` in the organization has to be used. For the latter, a machine user or a Github App can be used.

Example with PAT:
```yaml
      - uses: JOKR-Services/github-action-permissions@main
        with:
          token: "${{ secrets.MY_TOKEN }}"
```
`MY_TOKEN` has to be set in the Action secrets on the repository or organizational level.

Example with the access token of a Github App (which has the necessary permissions assigned):
```yaml
      - id: generate-token
        uses: getsentry/action-github-app-token@v1
        with:
          app_id: "${{ secrets.GITHUB_APP_ID }}"
          private_key: "${{ secrets.GITHUB_APP_PRIVATE_KEY }}"

      - name: Check generated token
        if: ${{ ! steps.generate-token.outputs.token }}
        run: |
          echo "::error file=.,title=Token Error::Check if the Github App is installed in the repository/organization and the private key/app id are correct."
          exit 1

      - uses: JOKR-Services/github-action-permissions@main
        with:
          token: "${{ steps.generate-token.outputs.token }}"
```
