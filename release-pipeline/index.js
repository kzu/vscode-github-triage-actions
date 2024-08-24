"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../common/Action");
const utils_1 = require("../common/utils");
const ReleasePipeline_1 = require("./ReleasePipeline");
const notYetReleasedLabel = (0, utils_1.getRequiredInput)('notYetReleasedLabel');
const insidersReleasedLabel = (0, utils_1.getRequiredInput)('insidersReleasedLabel');
class ReleasePipelineAction extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'ReleasePipeline';
    }
    async onReopened(issue) {
        await (0, ReleasePipeline_1.unenrollIssue)(issue, notYetReleasedLabel, insidersReleasedLabel);
    }
    async onClosed(issue) {
        await (0, ReleasePipeline_1.enrollIssue)(issue, notYetReleasedLabel);
    }
    async onTriggered(github) {
        const query = `is:issue is:closed label:unreleased -label:insiders-released is:issue is:closed closed:2024-07-25..2024-08-22`;
        (0, utils_1.safeLog)('Query:', query);
        for await (const page of github.query({ q: query })) {
            for (const issue of page) {
                await issue.removeLabel(notYetReleasedLabel);
                await issue.addLabel(insidersReleasedLabel);
            }
            // await new ReleasePipeline(github, notYetReleasedLabel, insidersReleasedLabel).run();
        }
    }
    async onCommented(issue, comment) {
        if (comment.includes('closedWith')) {
            await (0, ReleasePipeline_1.enrollIssue)(issue, notYetReleasedLabel);
        }
    }
}
new ReleasePipelineAction().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map