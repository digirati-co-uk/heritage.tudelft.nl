import { extract } from 'iiif-hss';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

extract({
    id: 'delft-related',
    name: 'Delft related',
    types: ['Manifest'],
    async collect(temp, api) {
        // We will save the results here later.
        // Lets save the raw to disk for now.
        const relatedMap = join(api.build.filesDir, "meta", "related-objects.json");

        const newRelations = {};
        const identifierMap = {};
        const entries = Object.entries(temp);
        for (const [key, value] of entries) {
            identifierMap[value.identifier] = key;
        }
        for (const [key, value] of entries) {
            const related = value.related;
            if (related && related.length) {
                const relatedIds = [];
                for (const relatedId of related) {
                    const relatedKey = identifierMap[relatedId];
                    if (relatedKey) {
                        relatedIds.push(relatedKey);
                    }
                }
                if (relatedIds.length) {
                    newRelations[key] = relatedIds;
                }
            }
        }

        // Write to disk.
        await writeFile(relatedMap, JSON.stringify(newRelations, null, 2));

    },
}, async (_, api, config) => {
    const resource = api.resource;
    const metadata = resource?.metadata;
    const related = [];
    let identifier = null;
    if (metadata.length) {
        // We are looking for 2 things.
        // 1. The identifier (Inventarisnummer)
        // 2. Related identifiers (Gerelateerd erfgoedobject)
        for (const metadataItem of metadata) {
            const label = metadataItem.label?.nl || metadataItem.label?.none;
            const value = metadataItem.value?.nl || metadataItem.value?.none;
            if (label && label[0]) {
                if (label[0] === 'Inventarisnummer') {
                    const singeValue = value[0];
                    if (singeValue) {
                        identifier = singeValue;
                    }
                }
                if (label[0] === 'Gerelateerd erfgoedobject') {
                    const singeValue = value[0];
                    if (singeValue) {
                        const regex = /([A-Z]{3}\.[0-9]{4}\.[0-9]{4})/g;
                        const matches = singeValue.match(regex);
                        if (matches) {
                            for (const match of matches) {
                                const [a, b, c] = match.split('.');
                                related.push(`${b}.${c}.${a}`);
                            }
                        }
                    }
                }
            }
        }

    }
    if (!identifier && !related.length) {
        return {};
    }

    return {
        temp: {
            identifier,
            related,
        }
    }
})
