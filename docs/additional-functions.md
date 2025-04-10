# Additional functions

This document describes the various additional function available in scriban.

            
- [`ascii` functions](#ascii-functions)
- [`custom` functions](#custom-functions)
- [`dateabsolute` functions](#dateabsolute-functions)
- [`datecalendar` functions](#datecalendar-functions)
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
- [`custom.string_to_int_array`](#customstring_to_int_array)
- [`custom.string_from_int_array`](#customstring_from_int_array)
- [`custom.make_array`](#custommake_array)
- [`custom.throw_problem_details`](#customthrow_problem_details)
- [`custom.throw_v1_error_response`](#customthrow_v1_error_response)
- [`custom.get_route_record`](#customget_route_record)

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
custom.base64_encode <text> <encodingName: "utf-8">?
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
custom.base64_decode <text> <encodingName: "utf-8">?
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
### `custom.string_to_int_array`

```
custom.string_to_int_array <text> <encodingName: "utf-8">?
```

#### Description

Convert a string to an int array

#### Arguments

- `text`: The text to convert
- `encodingName`: The [code page name](https://docs.microsoft.com/en-us/dotnet/api/system.text.encodinginfo.getencoding) of the preferred encoding.

#### Returns

Int array of the input

#### Examples

> **input**
```scriban-html
{{ "hello" | custom.string_to_int_array | json.serialize }}
```
> **output**
```html
[104, 101, 108, 108, 111]
```

[:top:](#additional-functions)
### `custom.string_from_int_array`

```
custom.string_from_int_array <data> <encodingName: "utf-8">?
```

#### Description

Convert an int array to a string

#### Arguments

- `data`: The int array to convert
- `encodingName`: The [code page name](https://docs.microsoft.com/en-us/dotnet/api/system.text.encodinginfo.getencoding) of the preferred encoding.

#### Returns

String from int array input

#### Examples

> **input**
```scriban-html
{{ [104, 101, 108, 108, 111] | custom.string_from_int_array }}
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

Create an error for the input, can handle single objects and arrays

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
custom.throw_problem_details <problemObject>
```

#### Description

Throw an exception from Scriban flow, stops the entire integration and returns a ProblemDetails Json response

#### Arguments

- `problemObject`: 

#### Returns



#### Examples



[:top:](#additional-functions)
### `custom.throw_v1_error_response`

```
custom.throw_v1_error_response <problemObject>
```

#### Description

Throw a an exception from Scriban flow, stops the entire integration and returns a Stitch V1 error Json response

#### Arguments

- `problemObject`: 

#### Returns



#### Examples



[:top:](#additional-functions)
### `custom.get_route_record`

```
custom.get_route_record <fileContent> <postCodeMinIndex> <postCodeMaxIndex> <countryCodeIndex> <postCode> <countryCode> <separator: ",">? <skipLines: 0>?
```

#### Description

Given CSV file content with records, post code min index, post code max index, country code index, post code and country code, returns the record that matches the post code and country code.

#### Arguments


#### Returns



#### Examples


[:top:](#additional-functions)

## `dateabsolute` functions

Custom functions for parsing and serializing absolute DateTimes with time zone offset

- [`dateabsolute.parse`](#dateabsoluteparse)
- [`dateabsolute.to_string`](#dateabsoluteto_string)

[:top:](#additional-functions)
### `dateabsolute.parse`

```
dateabsolute.parse <dateTimeString> <format>?
```

#### Description

Parse a string to an absolute date time (with offset), optionally using a specified format.

#### Arguments

- `dateTimeString`: String containing the date time with offset
/// - `format`: (Optional) The format in which the date time string should be interpreted (time zone mandatory).
See https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings .

#### Returns

An object that is equivalent to the date and time contained in text/// Throws an exception if the date time string or the optionally specified format
does not contain time zone information

#### Examples



[:top:](#additional-functions)
### `dateabsolute.to_string`

```
dateabsolute.to_string <dateTimeOffset> <format: "yyyy-MM-ddTHH:mm:ss.fffK">?
```

#### Description

Converts the value of an absolute date time (with offset) to its equivalent string representation, optionally using a specified format.
If no format is given, it will return an ISO 8601 compliant string.

#### Arguments

- `dateTimeOffset`: The absolute date time object to be serialized
- `format`: The custom format in which the date time offset string should be interpreted (time zone optional, but not mandatory).
See https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings .

#### Returns

>A string representation of the given DateTimeOffset in the given format, or in the default ISO 8601 compliant format

#### Examples


[:top:](#additional-functions)

## `datecalendar` functions

Custom functions for parsing and serializing calendar DateTimes without time zone offset

- [`datecalendar.parse`](#datecalendarparse)
- [`datecalendar.to_string`](#datecalendarto_string)

[:top:](#additional-functions)
### `datecalendar.parse`

```
datecalendar.parse <dateTimeString> <format>?
```

#### Description

Parse a string to a calendar date time (without time zone offset), optionally using a specified format.

#### Arguments

- `dateTimeString`: String containing the calendar date time
- `format`: (Optional) The format in which the date time string should be interpreted (time zone not allowed).
See https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings .

#### Returns

An object that is equivalent to the date and time contained in textThrows an exception if the date time string or the optionally specified format
contains time zone information

#### Examples



[:top:](#additional-functions)
### `datecalendar.to_string`

```
datecalendar.to_string <dateTime> <format: "yyyy-MM-ddTHH:mm:ss.fff">?
```

#### Description

Converts the value of a calendar date time (without time zone offset) to its equivalent string representation, optionally using a specified format.
If no format is given, it will return an ISO 8601 compliant string.

#### Arguments

- `dateTime`: The calendar date time object to be converted to string
- `format`: (Optional) The format in which the date time string should be formatted (time zone not allowed).
See https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings .

#### Returns

A string representation of the given calendar date time in the given format, or in the default ISO 8601 compliant format/// Throws an exception if:
1. the given date time contains time zone information
2. the custom format contains time zone information

#### Examples


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

The escaped string value

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

The escaped string value

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
myObject = { member1: "yes", member2: 123 }
myObject | json.serialize true
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


