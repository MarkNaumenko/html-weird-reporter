var fs = require('fs'),
    path = require('canonical-path'),
    _ = require('lodash'),
    excel4node = require('excel4node');

// Custom reporter
var Reporter = function(options) {

    var _defaultOutputFile = path.resolve(process.cwd(), './_test-output', 'protractor-results.html');
    options.outputFile = options.outputFile || _defaultOutputFile;

    initOutputFile(options.outputFile);
    options.appDir = options.appDir ||  './';
    var _root = { appDir: options.appDir, suites: [] };
    log('AppDir: ' + options.appDir, +1);
    var _currentSuite;

    this.suiteStarted = function(suite) {
        _currentSuite = { description: suite.description, status: null, specs: [] };
        _root.suites.push(_currentSuite);
        log('Suite: ' + suite.description, +1);
    };

    this.suiteDone = function(suite) {
        var statuses = _currentSuite.specs.map(function(spec) {
            return spec.status;
        });
        statuses = _.uniq(statuses);
        var status = statuses.indexOf('failed') >= 0 ? 'failed' : statuses.join(', ');
        _currentSuite.status = status;
        log('Suite ' + _currentSuite.status + ': ' + suite.description, -1);
    };

    this.specStarted = function(spec) {

    };

    this.specDone = function(spec) {
        var currentSpec = {
            description: spec.description,
            status: spec.status
        };
        if (spec.failedExpectations.length > 0) {
            currentSpec.failedExpectations = spec.failedExpectations;
        }

        _currentSuite.specs.push(currentSpec);
        log(spec.status + ' - ' + spec.description);

        //screenshot capture
        browser.takeScreenshot().then((base64png) => {
            var stream = fs.createWriteStream(spec.description + '.png');
            stream.write(new Buffer(base64png, 'base64'));
            stream.end();
        });
    };

    this.jasmineDone = function() {
        outputFile = options.outputFile;
        var output = formatOutput(_root);
        fs.appendFileSync(outputFile, output);
    };

    function ensureDirectoryExistence(filePath) {
        var dirname = path.dirname(filePath);
        if (directoryExists(dirname)) {
            return true;
        }
        ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    function directoryExists(path) {
        try {
            return fs.statSync(path).isDirectory();
        }
        catch (err) {
            return false;
        }
    }

    function initOutputFile(outputFile) {
        ensureDirectoryExistence(outputFile);
    }

    // for output file output
    function formatOutput(output) {

        var html = '<table border="1"><caption><h2>' + "Protractor results for: " + (new Date()).toLocaleString() + '</h2></caption>';
        html += '<tr><th>Description</th><th>Status</th><th>Screenshot</th><th>Message</th></tr><tbody>';
        output.suites.forEach(function(suite) {
            if(suite.status === "passed"){
                html = html +'<tr class="suite passed" bgcolor="green">';
            }else{
                html = html + '<tr class="suite failed" bgcolor="red">';
            }
            html = html + '<td colspan="4">Suite: ';
            html = html + suite.description + ' -- ' + suite.status + '</h3></td>';
            suite.specs.forEach(function(spec){

                if(spec.status === "passed") {
                    html = html + '<tr class="spec passed">';
                }else {
                    html = html + '<tr class="spec failed">';
                }   
                html = html + '<td>' + spec.description +'</td>';
                html = html + '<td>' + spec.status + '</td>';
                html = html + '<td><a href="' + '../' + spec.description + '.png' + '" class="screenshot">';
                        html = html + '<img height="200px" width="200px" src="'+ '../' + spec.description + '.png' + '"/>';
                        html = html + '</a></td><td>';
                if (spec.failedExpectations) {
                    spec.failedExpectations.forEach(function (fe) {
                        html = html + 'message: ' + fe.message;
                    });
                }
                html = html + '</td></tr>';
            })
        });
        html = html + '</tbody></table>';
        html = html + '</html>';
        return html;
    }

    // for console output
    var _pad;
    function log(str, indent) {
        _pad = _pad || '';
        if (indent == -1) {
            _pad = _pad.substr(2);
        }
        console.log(_pad + str);
        if (indent == 1) {
            _pad = _pad + '  ';
        }
    }
};

module.exports = Reporter;
