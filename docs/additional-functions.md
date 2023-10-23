# Additional functions

This document describes the various additional function available in scriban.

            
- [`ascii` functions](#ascii-functions)
- [`custom` functions](#custom-functions)
- [`json` functions](#json-functions)
- [`xml` functions](#xml-functions)
- [`datecalendar` functions](#datecalendar-functions)
- [`dateabsolute` functions](#dateabsolute-functions)

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


## `datecalendar` functions
Calendar date time functions are available through the object `datecalendar` in Scriban. 

- [ `datecalendar.parse`](#datecalendarparse)
- [ `datecalendar.to_string`](#datecalendarto_string)

[:top:](#additional-functions)

### `datecalendar.parse`

```
datecalendar.parse <text>
datecalendar.parse <text> <format>
```

#### Description
Parse a calendar date time string to a date time object without time zone offset, optionally with a specified format

#### Arguments
- `text`: 
  - The date time string to parse
  - **Note:** will throw an `ArgumentException` if the given `text` contains time zone information.
- `format`:
  - (Optional) A format specifier that defines the required format of text (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
  - **Note:** will throw an `ArgumentException` if the given `format` contains time zone information (i.e., `z` or `K` characters).

#### Returns
The parsed date time object

#### Examples

**1. Valid calendar date time string**
> **input**
```scriban-html
{{
    datecalendar.parse("2021-01-01T00:00:00")
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
    datecalendar.parse("2021-01-01T00:00:00Z")
}}
```

> **output**

throws `ArgumentException` : `Time zone specification is not allowed for calendar DateTime`


**3. date time string with valid local date time format**
> **input**
```scriban-html
{{
    datecalendar.parse_exact("2021-01-01T00:00:00", "yyyy-MM-ddTHH:mm:ss")
}}
```

> **output**
```html
01 Jan 2021 00:00:00
```

**4. date time string with invalid format containing time zone offset**
> **input**
```scriban-html
{{
    datecalendar.parse_exact("2021-01-01T00:00:00Z", "yyyy-MM-ddTHH:mm:ssK")
}}
```

> **output**

throws `ArgumentException` : `Time zone specification in custom format is not allowed for calendar DateTime`

[:top:](#additional-functions)


### `datecalendar.to_string`

```
datecalendar.to_string <datetime>
datecalendar.to_string <datetime> <format>
```

#### Description
Convert a calendar date time object to a string, optionally using a specified format.
If no format is given, the default, ISO 8601 compliant format `yyyy-MM-ddTHH:mm:ss.fff` is used.

#### Arguments
- `datetime`: 
  - The calendar date time object to convert
  - **Note:** will throw an `ArgumentException` if a `DateTimeOffset` object (i.e., an absolute date time) is given  instead of a `DateTime` object
- `format`:
    - A format specifier that defines the required format of the string (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
    - **Note:** will throw an `ArgumentException` if the given `format` contains time zone information (i.e., `z` or `K` characters).

#### Returns
The string representation of the calendar DateTime object

#### Examples

**1. Valid format**
> **input**
```scriban-html
{{
    dt = datecalendar.parse("2021-01-01T00:00:00")

    datecalendar.to_string(dt)
    datecalendar.to_string(dt, "yyyy-MM-ddTHH:mm:ss")
}}
```

> **output**
```html
2021-01-01T00:00:00.000
2021-01-01T00:00:00
```

**2. Invalid format containing time zone offset**
> **input**
```scriban-html
{{
    dt = datecalendar.parse("2021-01-01T00:00:00")
    datecalendar.to_string(dt, "yyyy-MM-ddTHH:mm:ssK")
}}
```

> **output**

throws `ArgumentException` : `Time zone specification in custom format is not allowed for calendar DateTime`

**3. Invalid absolute date time**
> **input**
```scriban-html
{{
    dt = dateabsolute.parse("2021-01-01T00:00:00Z")

    datecalendar.to_string(dt)
}}
```

> **output**

throws `ArgumentException` : `Unable to convert type 'DateTimeOffset' to 'DateTime'`

[:top:](#additional-functions)

## `dateabsolute` functions

Absolute date time functions are available through the object `dateabsolute` in Scriban.

- [ `dateabsolute.parse`](#dateabsoluteparse)
- [ `dateabsolute.to_string`](#dateabsoluteto_string)

[:top:](#additional-functions)

### `dateabsolute.parse`

```
dateabsolute.parse <text>
dateabsolute.parse <text> <format>
```

#### Description
Parse a date time string to an absolute date time object with time zone information, optionally with a specified format

#### Arguments
- `text`: 
  - The absolute date time string to parse
  - **Note:** will throw an `ArgumentException` if the given `text` does not contain time zone information.
- `format`:
  - (Optional) A format specifier that defines the required format of text (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
  - **Note:** will throw an `ArgumentException` if the given `format` does not contain time zone information (i.e., `z` or `K` characters).

#### Returns
The parsed absolute date time object

#### Examples

**1. Valid absolute date time string**
> **input**
```scriban-html
{{
    dateabsolute.parse("2021-01-01T00:00:00Z")
}}
```

> **output**
```html
01 Jan 2021 00:00:00 +00:00
```

**2. Invalid calendar date time string without time zone offset**
> **input**
```scriban-html
{{
    dateabsolute.parse("2021-01-01T00:00:00")
}}
```

> **output**

throws `ArgumentException` : `Time zone specification is mandatory for absolute DateTime`


**3. Date time string with valid custom format**

> **input**
```scriban-html
{{
    dateabsolute.parse_exact("2021-01-01T00:00:00Z", "yyyy-MM-ddTHH:mm:ssK")
}}
```

> **output**
```html
01 Jan 2021 00:00:00 +00:00
```

**4. Date time string with invalid format without time zone offset**
> **input**
```scriban-html
{{
    dateabsolute.parse_exact("2021-01-01T00:00:00", "yyyy-MM-ddTHH:mm:ss")
}}
```

> **output**

throws `ArgumentException` : `Time zone specification in custom format is mandatory for absolute DateTime`

[:top:](#additional-functions)


### `dateabsolute.to_string`

```
dateabsolute.to_string <datetime>
dateabsolute.to_string <datetime> <format>
```

#### Description
Convert an absolute date time object to a string, optionally using a specified format.
If no format is given, the default, ISO 8601 compliant format `yyyy-MM-ddTHH:mm:ss.fffK` is used.

#### Arguments
- `datetime`: 
  - The absolute date time object to convert
  - **Note:** will throw an `ArgumentException` if the given argument is a calendar date time object (instead of an absolute date time object)
- `format`:
  - A format specifier that defines the required format of the string (see [Microsoft's date time format specifications](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings))
  - **Note:** it is NOT mandatory to specify a time zone offset in the given `format`.

#### Returns
The string representation of the absolute date time object in the specified format

#### Examples

**1. Valid absolute date time**
> **input**
```scriban-html
{{
    dt = dateabsolute.parse("2021-01-01T00:00:00Z")

    dateabsolute.to_string(dt)
    dateabsolute.to_string(dt, "yyyy-MM-ddTHH:mm:ss")
    dateabsolute.to_string(dt, "yyyy-MM-ddTHH:mm:ssK")
}}
```

> **output**
```html
2021-01-01T00:00:00+00:00
2021-01-01T00:00:00
2021-01-01T00:00:00+00:00
```

**2. Invalid calendar date time**
> **input**
```scriban-html
{{
    dt = date.parse("2021-01-01T00:00:00")

    dateabsolute.to_string(dt)
}}
```

> **output**

throws `ArgumentException` : `Argument must be of type DateTimeOffset, but was DateTime`

[:top:](#additional-functions)


