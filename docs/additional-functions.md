# Additional functions

This document describes the various additional function available in scriban.

            
- [`ascii` functions](#ascii-functions)
- [`custom` functions](#custom-functions)
- [`json` functions](#json-functions)
- [`xml` functions](#xml-functions)

[:top:](#additional-functions)

## `ascii` functions

Unicode to ASCII transliteration

- [`ascii.transliterate`](#asciitransliterate)

[:top:](#additional-functions)
### `ascii.transliterate`

```
ascii.transliterate <text>
```

#### Description

Simplify Unicode to ASCII using Transliteration (Spelling). Will return value from [Output](https://github.com/anyascii/anyascii#examples) column.

#### Arguments

- `text`: The Unicode text to convert.

#### Returns

Text as ASCII/// 

#### Examples

> **input**
```scriban-html
{{ "Blöße" | ascii.transliterate }}
```
> **output**
```html
Blosse
```
[:top:](#additional-functions)

## `custom` functions

Custom functions available through the object 'custom' in scriban.

- [`custom.date_parse_exact`](#customdate_parse_exact)
- [`custom.base64_encode`](#custombase64_encode)
- [`custom.base64_decode`](#custombase64_decode)
- [`custom.make_array`](#custommake_array)
- [`custom.throw_problem_details`](#customthrow_problem_details)
- [`custom.throw_v1_error_response`](#customthrow_v1_error_response)

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
### `custom.make_array`

```
custom.make_array <input>
```

#### Description

Create a error for the input, can handle single objects and arrays

#### Arguments

- `input`: 

#### Returns

A ScriptArray from the input

#### Examples

> **input**
```scriban-html
{{ "123" | custom.make_array }}
{{ [123,1213] | custom.make_array }}
```
> **output**
```html
["123"]
[123,1213]
```
[:top:](#additional-functions)

### `custom.throw_problem_details`

```
custom.throw_problem_details <input>
```

#### Description

Stop the integration flow, and return directly with a response message formatted according to [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807).

#### Arguments

- `input`: 
  - native `Scriban` object that looks as follows:

```scriban-html
{{
    $input = {
        type: "type",
        title: "title",
        status: 400,
        detail : "detail",
        errors: [ 
            {
                errorCode: "code",
                errorMessage: "message",
                explanationMessage: "joop"
            }
        ]
    }
}}
```

No fields in `input` are mandatory.

#### Returns

The function does not strictly return anything, but has as an effect that it stops the integration flow and returns a response in almost the same format:

```json
{
    "type": "type",
    "title": "title",
    "status": 400,
    "detail" : "detail",
    "instance": "/examples/dummy/throwing-v2",
    "errors": [ 
        {
            "errorCode": "code",
            "errorMessage": "message",
            "explanationMessage": "joop"
        }
    ]
}
```

The `instance` field is non-settable and automatically added. It contains the `Stitch` integration path of the throwing integration.

Note, that the http status code of the `stitch` api call response will be equal to the `status` code returned in the `input` Scriban object. 

#### Examples

After defining the input object as mentioned above, you can call the method as follows:

```scriban-html
{{
    custom.throw_problem_details($input)
}}
```

[:top:](#additional-functions)

### `custom.throw_v1_error_response`

```
custom.throw_v1_error_response <input>
```

#### Description

Stop the integration flow, and return directly with a response message formatted according to the 'classic' `v1` error message as described below.

#### Arguments

- `input`: 
  - native `Scriban` object that looks as follows:

```scriban-html
{{
    $input = {
        resultMessages : [
            "integration failed"
        ],
        errors: [ 
            {
                errorCode: "code",
                errorMessage: "message",
                explanationMessage: "explanation"
            }
        ]
    }
}}
```

No fields in `input` are mandatory.

#### Returns

The function does not strictly return anything, but has as an effect that it stops the integration flow and returns a response in almost the same format:

```json
{
    "AWB": "",
    "ShipmentStatus": "",
    "ResultMessages": [
        "integration failed"
    ],
    "Errors": [
        {
            "ErrorCode": "code",
            "ErrorMessage": "message",
            "ExplanationMessage": "explanation"
        }
    ]
}
```

The `AWB` and `ShipmentStatus` fields are auto-added and always empty strings.
Note, that using this throw function, will always return the original `stitch` api call with a `200` http status code.

#### Examples

After defining the input object as mentioned above, you can call the method as follows:

```scriban-html
{{
    custom.throw_v1_error_response($input)
}}
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
    "member1": "yes",
    "member2": 123
}
```
[:top:](#additional-functions)

## `xml` functions

XML functions available through the object 'xml' in scriban.

- [`xml.serialize`](#xmlserialize)
- [`xml.escape`](#xmlescape)

[:top:](#additional-functions)
### `xml.serialize`

```
xml.serialize <value>
```

#### Description

Convert object to XML

#### Arguments

- `value`: 

#### Returns

Formatted XML presentation of the value

#### Examples



[:top:](#additional-functions)
### `xml.escape`

```
xml.escape <value>
```

#### Description

Escape a string so it's safe to use in XML nodes

#### Arguments

- `value`: The value to escape

#### Returns

The XML escaped value

#### Examples


## `datetimelocal` functions
Local date time functions are available through the object `datetimelocal` in Scriban. 

-[ `datetimelocal.parse`](#datetimelocalparse)
-[ `datetimelocal.parse_exact`](#datetimelocalparseexact)
-[ `datetimelocal.to_string_default`](#datetimelocaltostringdefault)
-[ `datetimelocal.to_string`](#datetimelocaltostring)

[:top:](#additional-functions)

### `datetimelocal.parse`

```
datetimelocal.parse <text>
```

#### Description
Parse a local date time string to a local date time object

#### Arguments
- `text`: 
  - The date time string to parse
  - **Note:** will throw an `ArgumentException` if the given `text` contains time zone information.

#### Returns
The parsed local date time object

#### Examples

**1. Valid local date time string**
> **input**
```scriban-html
{{
    dt = datetimelocal.parse("2021-01-01T00:00:00")
    dt
}}
```

> **output**
```html
01 Jan 2021 00:00:00
```

**2. Invalid date time string containing time zone offset**
> **input**
```scriban-html
{{
    dt = datetimelocal.parse("2021-01-01T00:00:00Z")
    dt
}}
```

> **output**

throws `ArgumentException` : `Time zone specification is not allowed for local DateTime`

[:top:](#additional-functions)


### `datetimelocal.parse_exact`

```
datetimelocal.parse_exact <text> <format>
```

#### Description
Parse a local date time string to a local date time object using the specified format

#### Arguments
- `text`: 
  - The date time string to parse
- `format`:
  - A format specifier that defines the required format of text (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
  - **Note:** will throw an `ArgumentException` if the given `format` contains time zone information (i.e., `z` or `K` characters).

#### Returns
The parsed local date time object

#### Examples

**1. date time string in valid local date time format**
> **input**
```scriban-html
{{
    dt = datetimelocal.parse_exact("2021-01-01T00:00:00", "yyyy-MM-ddTHH:mm:ss")
    dt
}}
```

> **output**
```html
01 Jan 2021 00:00:00
```

**2. date time string in invalid format containing time zone offset**
> **input**
```scriban-html
{{
    dt = datetimelocal.parse_exact("2021-01-01T00:00:00Z", "yyyy-MM-ddTHH:mm:ssK")
    dt
}}
```

> **output**

throws `ArgumentException` : `Time zone specification in custom format is not allowed for local DateTime`

[:top:](#additional-functions)

### `datetimelocal.to_string_default`

```
datetimelocal.to_string_default <datetime>
```

#### Description
Convert a local date time object to an ISO 8601 compliant string using a default format

#### Arguments
- `datetime`: 
  - The local date time object to convert

#### Returns
The ISO 8601 compliant string representation of the local date time object

#### Examples
> **input**
```scriban-html
{{
    dt = datetimelocal.parse("2021-01-01T00:00:00")
    str = datetimelocal.to_string_default(dt)
    str
}}
```

> **output**
```html
2021-01-01T00:00:00.000
```

[:top:](#additional-functions)

### `datetimelocal.to_string`

```
datetimelocal.to_string <datetime> <format>
```

#### Description
Convert a local date time object to a string using the specified format

#### Arguments
- `datetime`: 
  - The local date time object to convert
- `format`:
    - A format specifier that defines the required format of the string (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
    - **Note:** will throw an `ArgumentException` if the given `format` contains time zone information (i.e., `z` or `K` characters).

#### Returns
The string representation of the local date time object

#### Examples

**1. Valid format**
> **input**
```scriban-html
{{
    dt = datetimelocal.parse("2021-01-01T00:00:00")
    str = datetimelocal.to_string(dt, "yyyy-MM-ddTHH:mm:ss")
    str
}}
```

> **output**
```html
2021-01-01T00:00:00
```

**2. Invalid format containing time zone offset**
> **input**
```scriban-html
{{
    dt = datetimelocal.parse("2021-01-01T00:00:00")
    str = datetimelocal.to_string(dt, "yyyy-MM-ddTHH:mm:ssK")
    str
}}
```

> **output**

throws `ArgumentException` : `Time zone specification in custom format is not allowed for local DateTime`

[:top:](#additional-functions)

## `datetimeoffset` functions

Date time offset functions are available through the object `datetimeoffset` in Scriban.

-[ `datetimeoffset.parse`](#datetimeoffsetparse)
-[ `datetimeoffset.parse_exact`](#datetimeoffsetparseexact)
-[ `datetimeoffset.to_string_default`](#datetimeoffsettostringdefault)
-[ `datetimeoffset.to_string`](#datetimeoffsettostring)

[:top:](#additional-functions)

### `datetimeoffset.parse`

```
datetimeoffset.parse <text>
```

#### Description
Parse a date time string to a date time offset object

#### Arguments
- `text`: 
  - The date time string to parse
  - **Note:** will throw an `ArgumentException` if the given `text` does not contain time zone information.

#### Returns
The parsed date time offset object

#### Examples

**1. Valid date time string**
> **input**
```scriban-html
{{
    dt = datetimeoffset.parse("2021-01-01T00:00:00Z")
    dt
}}
```

> **output**
```html
01 Jan 2021 00:00:00 +00:00
```

**2. Invalid date time string without time zone offset**
> **input**
```scriban-html
{{
    dt = datetimeoffset.parse("2021-01-01T00:00:00")
    dt
}}
```

> **output**

throws `ArgumentException` : `Time zone specification is mandatory for DateTimeOffset`

[:top:](#additional-functions)


### `datetimeoffset.parse_exact`

```
datetimeoffset.parse_exact <text> <format>
```

#### Description
Parse a date time string to a date time offset object using the specified format

#### Arguments
- `text`: 
  - The date time string to parse
- `format`:
  - A format specifier that defines the required format of text (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
  - **Note:** will throw an `ArgumentException` if the given `format` does not contain time zone information (i.e., `z` or `K` characters).

#### Returns
The parsed date time offset object

#### Examples

**1. date time string in valid format**

> **input**
```scriban-html
{{
    dt = datetimeoffset.parse_exact("2021-01-01T00:00:00Z", "yyyy-MM-ddTHH:mm:ssK")
    dt
}}
```

> **output**
```html
01 Jan 2021 00:00:00 +00:00
```

**2. date time string in invalid format without time zone offset**
> **input**
```scriban-html
{{
    dt = datetimeoffset.parse_exact("2021-01-01T00:00:00", "yyyy-MM-ddTHH:mm:ss")
    dt
}}
```

> **output**

throws `ArgumentException` : `Time zone specification in custom format is mandatory for DateTimeOffset`

[:top:](#additional-functions)


### `datetimeoffset.to_string_default`

```
datetimeoffset.to_string_default <datetimeoffset>
```

#### Description
Convert a date time offset object to an ISO 8601 compliant string using a default format

#### Arguments
- `datetimeoffset`: 
  - The date time offset object to convert

#### Returns
The ISO 8601 compliant string representation of the date time offset object

#### Examples

> **input**
```scriban-html
{{
    dt = datetimeoffset.parse("2021-01-01T00:00:00Z")
    str = datetimeoffset.to_string_default(dt)
    str
}}
```

> **output**
```html
2021-01-01T00:00:00.000+00:00
```

[:top:](#additional-functions)


### `datetimeoffset.to_string`

```
datetimeoffset.to_string <datetimeoffset> <format>
```

#### Description
Convert a date time offset object to a string using the specified format

#### Arguments
- `datetimeoffset`: 
  - The date time offset object to convert
  - `format`:
    - A format specifier that defines the required format of the string (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
    - **Note:** it is NOT mandatory to specify a time zone offset in the given `format`.

#### Returns
The string representation of the date time offset object in the specified format

#### Examples

> **input**
```scriban-html
{{
    dt = datetimeoffset.parse("2021-01-01T00:00:00Z")
    str1 = datetimeoffset.to_string(dt, "yyyy-MM-ddTHH:mm:ss")
    str2 = datetimeoffset.to_string(dt, "yyyy-MM-ddTHH:mm:ssK")
    str1
    str2
}}
```

> **output**
```html
2021-01-01T00:00:00
2021-01-01T00:00:00+00:00
```

[:top:](#additional-functions)


