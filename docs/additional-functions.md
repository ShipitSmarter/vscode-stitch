# Additional functions

This document describes the various additional function available in scriban.

            
- [`custom` functions](#custom-functions)
- [`json` functions](#json-functions)

[:top:](#additional-functions)

## `custom` functions

Custom functions available through the object 'custom' in scriban.

- [`custom.date_parse_exact`](#customdate_parse_exact)
- [`custom.base64_encode`](#custombase64_encode)
- [`custom.base64_decode`](#custombase64_decode)

[:top:](#additional-functions)
### `custom.date_parse_exact`

```
custom.date_parse_exact <text> <format>
```

#### Description

Converts the specified string representation of a date and time to its System.DateTime
equivalent using the specified format.
The format of the string representation must match the specified format exactly.

#### Arguments

- `text`: A string that contains a date and time to convert.
- `format`: A format specifier that defines the required format of text.
            For more information, see the Remarks section.

#### Returns

An object that is equivalent to the date and time contained in text

#### Examples

> **input**
```scriban-html
{{ "2012-04-20" | custom.date_parse_exact 'yyyy-MM-dd' }}
```
> **output**
```html
20 Apr 2012
```

[:top:](#additional-functions)
### `custom.base64_encode`

```
custom.base64_encode <text> <encodingName: "UTF8">?
```

#### Description

Encodes a string to its Base64 representation, using the specified encoding.

#### Arguments

- `text`: The string to encode
- `encodingName`: The [code page name](https://docs.microsoft.com/en-us/dotnet/api/system.text.encodinginfo.getencoding) of the preferred encoding.

#### Returns

The encoded string

#### Examples

> **input**
```scriban-html
{{ "hello" | custom.base64_encode 'ASCII' }}
```
> **output**
```html
aGVsbG8=
```

[:top:](#additional-functions)
### `custom.base64_decode`

```
custom.base64_decode <text> <encodingName: "UTF8">?
```

#### Description

Decodes a Base64-encoded string to a string with specified encoding.

#### Arguments

- `text`: The string to decode
- `encodingName`: The [code page name](https://docs.microsoft.com/en-us/dotnet/api/system.text.encodinginfo.getencoding) of the preferred encoding.

#### Returns

The decoded string

#### Examples

> **input**
```scriban-html
{{ "aGVsbG8=" | custom.base64_decode 'ASCII' }}
```
> **output**
```html
hello
```
[:top:](#additional-functions)

## `json` functions

Json functions available through the object 'json' in scriban.

- [`json.escape`](#jsonescape)
- [`json.unescape`](#jsonunescape)
- [`json.serialize`](#jsonserialize)

[:top:](#additional-functions)
### `json.escape`

```
json.escape <unescapedValue>
```

#### Description

Escape a json string

#### Arguments

- `unescapedValue`: The json string

#### Returns

The excaped string value

#### Examples

> **input**
```scriban-html
{{'te"st' | json.escape}}
```
> **output**
```html
te\"st
```

[:top:](#additional-functions)
### `json.unescape`

```
json.unescape <jsonEscapedValue>
```

#### Description

Unescape a json string

#### Arguments

- `jsonEscapedValue`: The json string

#### Returns

The excaped string value

#### Examples

> **input**
```scriban-html
{{'te\\"st' | json.unescape}}
```
> **output**
```html
te"st
```

[:top:](#additional-functions)
### `json.serialize`

```
json.serialize <value> <format: False>?
```

#### Description

Serializes the specified value to a JSON string

#### Arguments

- `value`: The object to serialize
- `format`: if true output will be formatted using indenting

#### Returns

The JSON presentation of the value

#### Examples

> **input**
```scriban-html
{{
myobject = { member1: "yes", member2: 123 }
myobject | json.serialize true
}}
```
> **output**
```html
{
    "member1": {
        "Value": "yes",
        "IsReadOnly": false
    },
    "member2": {
        "Value": 123,
        "IsReadOnly": false
    }
}
```
