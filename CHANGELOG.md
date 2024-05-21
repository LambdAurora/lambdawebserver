# LambdaWebServer changelog

## 1.0.0

- Initial release.
- Added logger middleware.
- Added proxy middleware.

## 1.1.0

- Added static file serving middleware.

### 1.1.1

- Fixed path normalization test not working
   with un-normalized root paths in static file serving middleware.

### 1.1.2

- Fixed static file middleware not running next middleware if the file was not found.

## 2.0.0

- Updated standard library to 0.220.1.
- Updated oak to 14.2.0.

## 3.0.0

- Standardized project structure.
- Complete documentation.
- Use and publish to JSR.
- Updated standatd library.
- Updated oak to 16.0.0.
