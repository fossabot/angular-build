angular-build
=====================

<!-- Badges section here. -->
[![Build status](https://img.shields.io/appveyor/ci/mmzliveid/angular-build.svg?label=appveyor)](https://ci.appveyor.com/project/mmzliveid/angular-build)
[![Build Status](https://img.shields.io/travis/BizAppFramework/angular-build/master.svg?label=travis)](https://travis-ci.org/BizAppFramework/angular-build)
[![npm version](https://badge.fury.io/js/%40bizappframework%2Fangular-build.svg)](https://badge.fury.io/js/%40bizappframework%2Fangular-build)
[![Dependency Status](https://david-dm.org/bizappframework/angular-build.svg)](https://david-dm.org/bizappframework/angular-build)
[![npm](https://img.shields.io/npm/dm/@bizappframework/angular-build.svg)](https://www.npmjs.com/package/@bizappframework/angular-build)

## What is this?

Build system for Angular app and library projects similar to [angular-cli](https://github.com/angular/angular-cli) with some customization:

- Build support for both library projects (internally with [rollup](https://github.com/rollup/rollup)) and app projects (internally with [webpack](https://github.com/webpack/webpack))
- DLL bundling support for optimizing build time, see [DllPlugin](https://github.com/webpack/docs/wiki/list-of-plugins#dllplugin), [DllReferencePlugin](https://github.com/webpack/docs/wiki/list-of-plugins#dllreferenceplugin)
- Multi-platform favicons generation (online/offline)- integration with [realfavicongenerator](http://realfavicongenerator.net) and [evilebottnawi/favicons](https://github.com/evilebottnawi/favicons)
- Customizable html injection - can inject scripts, styles, favicons, etc into separate files
- Can build with webpack cli directly

## Prerequisites

Make sure you have [Node](https://nodejs.org/en/download/) version >= 6.9 and npm >= 3. 

## Table of Contents

* [Installation](#installation)
* [How to build](#how-to-build)
* [License](#license)

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)
```bash
npm install -g @bizappframework/angular-build
```
## How to build
1. Add **angular-build.json** config file in your project.
2. Specify **srcDir**, **outDir**, **entry** etc.
3. Type **ngb build** at command line.
4. More information, see [Wiki](https://github.com/BizAppFramework/angular-build/wiki).

### License

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](/LICENSE) 
