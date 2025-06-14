# Change Log

All notable changes to the "vscode-stitch" extension will be documented in this file.

# 1.8.9

- improve error message visualization in integration preview
  - now kept the newlines and added bullet points

# 1.8.8

- Add support for `Retries` configuration inside `HTTP` steps
  - Show `Retries` config in preview
  - Show actually executed number of retries and total duration in preview

# 1.8.7

- Add format validation for integration response

# 1.8.6

- Fix broken layout of integration prevew

# 1.8.5

- Show functional error message when invalid `json` or `xml` in HTTP step

# 1.8.4

- Allow `PrettyPrint` through settings

# 1.8.3

- Add Base64Encode step
- Fix CacheStore step rendering
- Fix CacheLoad step rendering
- Bump `@vscode/test-electron` to 2.3.8 to fix test issues

# 1.8.2

- Allow `configs.yaml` instead of `imports.configs.yaml` in scenario folder
- Correctly render `Configuration` tree in `Tree view` for integrations containing `configs.yaml` scenarios

# 1.8.1

- Max dirs up to find `RootFolder` is now configurable through a setting `stitch.maxDirsUpToFindRootFolder`

# 1.8.0

- Move `Model Tree` into `Explorer` view
- Fix issue where `Create HTTP Request` button was no longer working

# 1.7.1

- Revert update of `glob` package (sticking to 7.2.3), this caused issues on windows systems :(

# 1.7.0

- Stitch Model Tree complete overhoal, data is determined by the Simulation Endpoint instead of typescrypt.
- Removed create Secret functionality

# 1.6.0

- QueryString and Route are now available in TreeView

# 1.5.7

- Fix issue with {{Env.ConfigsRootDir}}

# 1.5.6

- Removed support for [configs]/@locationInstructionsm in favour of {{Env.ConfigsRootDir}}

# 1.5.5

- Fixes an issue with the extension failing silently if no instruction file is present in scenario folder

# 1.5.4

- The contents of imported files will now show up in the model tree

# 1.5.3

- Added support for configs
  - via '[configs]/@locationInstructions' placeholder in Imports

# 1.5.2

- Fix issue with multipart http preview

# 1.5.1

- Added support for the Loop step in the preview window

# 1.5.0

- Added support for YAML integration.yaml files
- Autocomplete when adding YAML files

# 1.4.1

- Added support for Multipart HTTP step

# 1.4.0

- EncodingName is shown when it is set in a step
- Bump all dependencies and require new vscode version

# 1.3.2

- Model tree view now also support input which should be pre parsed

# 1.3.1

- Add Request.PreParser configuration support
- Change maxUp to 7 (was 5) for locating Root folder

# 1.3.0

- Support for relative and absolute (starting with /) Scriban includes
  - Root folder name can be configured through setting `stitch.rootFolderName`

# 1.2.0

- Model tree is now Scriban context aware (auto adds braces {{}} if needed)
- Model tree now supports properties that require array indexer
- Support for different OutputTypes (Json, Xml, PlainText, BinaryAsBase64)

# 1.1.3

- Add `Request.Query` to TreeView

# 1.1.2

- Moving docs

# 1.1.1

- Support RAW HTTP Request and Response
- Create HTTP Request from step
- Keep active scenario if context not changed
- Model tree now has better error information

# 1.1.0

- Model tree view can now be opened without having to open the preview window
- Model tree view now updates even if the integration preview gives a render error
- Model tree view now shows all steps (before only HTTP steps)
- Selected scenario is not reset to default as long as the integration context lives
- Fixed bug with not correctly resetting scroll position in preview after encountering multiple errors in sequence
- Add support for integrations with no steps specified
- Added command to open model tree view (Stitch: Show Model Tree) while in an \*.integration.json file
- Context update not happening anymore when not needed (e.g. switching between files in the same integration context)
- Updated all package dependencies to latest versions

## 1.0.2

- Improve preview of skipped and unknown step types

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
