# Documentation

This is a vscode extension to help with creating, testing and debugging Stitch integration files. Within an integration we support using scriban for templating.

* See the [Scriban documentation](https://raw.githubusercontent.com/scriban/scriban/master/doc/) on how to use `scriban` in your templates.
* Next to the built-in scriban functions, we have some [additional functions](additional-functions.md).


## Getting started

To get started open the *Command Palette* (`Ctrl`+`Shift`+`P`) and search for `Stitch: Preview`

Once the command is executed the Preview window appears to the right of your current open document.

![Command Start](screenshots/command-start-preview.gif)

Another way to start the preview is opening a `*.integration.json` file and clicking the icon in the titlebar.

![Title bar icon](screenshots/title-bar-icon.png)

## Model Tree

When an integration file is active or Stitch Preview is activated, the **Stitch Model Tree** view can be opened. Use this to gain access to the model properties in your [Scriban](https://github.com/scriban/scriban) templates.

![Model tree](screenshots/model-tree-view.png)

By extending the tree items, and clicking on the desired node, that property is inserted to the current Text Document.

A inserted property looks like `{{Model.MyProperty}}`

## Basic Integration structure

A typical intregration has the following project structure:

```js
/track                        // The actual integration folder
  /scenarios                  // Predefined folder to store scenarios under
    /scenario1                // A scenario to test the integration
      - input.txt             // Input for the request (.txt, .json and .xml are supported)
      - step.*.txt            // Response for step with Id * (.txt, .json and .xml are supported)
  - track.integration.json    // Integration definition
  - request-body.json         // Scriban template for the request
  - response-body.json        // Scriban template for the response
```

## Advanced Integration structure

A more complex structure might look like:

```js
/carrier
  /imports                    // contains files shared acros integrations
    - test.json
    - acceptance.json
  /track
    /scenarios
      /sample1
        - input.json               
        - step.authenticate.xml 
        - step.book.txt
      /sample2
        - input.json
        - step.authenticate.xml
        - step.book.txt
    - track.integration.json
    - request-auth.json
    - request-book.json
    - response-body.json
  /book
    /scenarios
      /sample1
        - input.txt
        - step.authenticate.txt
        - step.book.txt
    - book.integration.json
    - request-body.json
    - response-body.json
```

Here the `track.integration.json` contains 2 steps, identified by the `Id` property. The scenario should contain a file for each defined step, which follows the naming convention `step.{Id}.(txt|json|xml)`.

```json
// Modified example for brevity

{
    "Imports": [
        "../imports/{{Environment}}.json"
    ],
    "Request": ...,
    "Steps": [
        {
            "$type": "Core.Entities.Configs.Steps.HttpConfiguration, Core",
            "Id": "authenticate",
            "Method": "GET",
            "Url": "https://somedomain.com/api/auth",
            "Template": "{{include 'request-auth.json'}}"
        },
        {
            "$type": "Core.Entities.Configs.Steps.HttpConfiguration, Core",
            "Id": "book",
            "Method": "GET",
            "Url": "https://somedomain.com/api/book",
            "Template": "{{include 'request-book.json'}}"
        }
    ],
    "Response": {
        "Body": "{{include 'response-body.json'}}",
        "Headers": {},
        "StatusCode": 200
    }
}
```

## Hashes

To secure an integration a `Hash` needs to be created, which functions as an access key.

You can create a hash using the *Command Palette* (`Ctrl`+`Shift`+`P`) and searching for `Stitch: Create Hash`.

After you entered the value, the hash is inserted to you active document, or copied to your `clipboard`.

## Extension Settings

This extension contributes the following settings:

* `stitch.endpointUrl`: set to the desired endpoint to test stitch integrations
* `stitch.debounceTimeout`: set to the desired amount (ms) to wait with updating the context after file changes (prevents updating on every character insert)