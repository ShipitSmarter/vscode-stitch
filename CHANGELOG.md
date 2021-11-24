# Change Log

All notable changes to the "vscode-stitch" extension will be documented in this file.

## 1.0.1
- Bugfix handle nullable fields correctly

## 1.0.0
- Complete styling overhaul of the preview window
- Introduced debounce for updating preview. Wait timeout can be configured via `stitch.debounceTimeout`
- Preview has been extended with all step configuration values
- Added preview for Mail and SFTP step
- Preview now remembers scroll position before render error happened

## 0.5.3
- Bugfix crash of stitch.preview command when a not found file is read
- Improve error display by escaping possible HTML in message

## 0.5.2
- Bugfix untitled files in workspace caused reloading

## 0.5.1
- Fix errors when using imports or translations (crashed extension or resulted in incorrect behaviour)
- Update preview on all changes in workspace (keeps current integration context instead of giving error 'No .integration.json file found')

## 0.5.0
- Add support to preview intergration response and step requests (json, xml)
- Add support to preview pdf step responses

## 0.4.0
- Add support for translation files (CSV based)

## 0.3.4
- Add support for statusCode result

## 0.3.2
- Add local and test environment for secret creation

## 0.3.0
- Improve (active) preview context detection
- Show response (output), even if it's not valid json
- Scenario files now also support .json and .xml (next to .txt)

## 0.2.2
- Hashes and Secrets are now inserted to the active document, if there is none copied to the clipboard.

## 0.2.0
- Published extension to Github

## 0.1.3
- Added `Show source` button to TreeView

## 0.1.2
- Introduced `scenarios` directory as a container for scenarios
- Scriban templates with .sbn extension are now supported

## 0.1.1
- Refactored the types and better integration with the API

## 0.1.0
- TreeView added for use with Scriban templates

## 0.0.4
- Display request for each step in preview
- Fixed icon placement

## 0.0.3
- Added commands to create Hashes and Secrets

## 0.0.2
- Preview pane and statusbar to switch scenario.
- Auto configure json schema's for integration and integration metadata files.
- Setting for test endpoint url.

### Note

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.