/**
 * @description Fabricator module that creates a dependency tracker.
 * @author Cam Tullos cam@tullos.ninja
 */

/**
 * Required dependencies
 */
const globby         = require('globby');
const fs             = require('fs');
const path           = require('path');
const _              = require('lodash');
const matter         = require('gray-matter');
const yaml           = require('js-yaml');
const beautify_js    = require('js-beautify');
const log = console.log.bind(console);

const dna = {

    getMatter: function (file) {
        return matter.read(file, {
            parser: require('js-yaml').safeLoad
        });
    },

    scan: (file, files, data) => {
        data['helix'] = {};
        data['file'] = file.split('/').pop();

        // Get dependents
        if (data.hasOwnProperty('dna')) {
            let props = (_.isArray(data.dna)) ? data.dna : [data.dna];
            let helix = [];
            _.without(files, file).forEach((f) => {
                let cont    = String(fs.readFileSync(f, 'utf-8'));
                let m       = dna.scanFile(cont, props);
                if (m !== null) {
                    helix.push({file: f.split('/').pop(), tags: m});
                }
            });

            if (helix.length > 0) {
                data['helix']['dependents'] = helix;
            }
        }

        // Get dependencies
        let cont = String(fs.readFileSync(file, 'utf-8'));
        let helix = [];
        _.without(files, file).forEach((f) => {
            let d = dna.getMatter(f);
            d = d.data;
            if (d.hasOwnProperty('dna')) {
                let props = (_.isArray(d.dna)) ? d.dna : [d.dna];

                let m = dna.scanFile(cont, props);
                if (m !== null) {
                    helix.push({file: f.split('/').pop(), tags: m});
                }
            }
        });
        if (helix.length > 0) {
            data['helix']['dependency'] = helix;
        }

        if (data.helix.hasOwnProperty('dependents') || data.helix.hasOwnProperty('dependency')) {
            log('\n' + JSON.stringify(data) + '\n');
        }

        return data;
    },

    scanFile: (content, props) => {
        let matches = [];
        let findTag = /<[^\/].*?>/g;
        let element = findTag.exec(content);

        while (element) {
            element = element[0];

            // Match id attribute
            let id = (element.match(/id s=["|'](.*?)["|']/i) || [, ""])[1];
            if (id) {
                let p = '#';
                let i = _.intersection([id], props);
                i.forEach((m) => { matches.push(p + m); });
            }

            // Match data-dna attribute
            let cmp = (element.match(/data-dna=["|'](.*?)["|']/i) || [, ""])[1];
            if (cmp) {
                let p = 'data-dna=';
                let i = _.intersection([cmp], props);
                i.forEach((m) => { matches.push(p + m); });
            }

            // Match class attribute
            let classes = (element.match(/class=["|'](.*?)["|']/i) || [,""])[1].split(' ');
            classes = _.compact(classes);
            if (classes.length > 0) {
                let p = '.';
                let i = _.intersection(_.compact(classes), props);
                i.forEach((m) => { matches.push(p + m); });
            }

            element = findTag.exec(content);
        }

        matches = _.uniq(matches);

        return (matches.length > 0) ? matches : null;
    }

};



/**
 * Exports
 */
module.exports = dna.scan;
