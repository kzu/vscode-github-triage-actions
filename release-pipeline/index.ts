/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OctoKit, OctoKitIssue } from '../api/octokit';
import { Action } from '../common/Action';
import { getRequiredInput, safeLog } from '../common/utils';
import { enrollIssue, unenrollIssue } from './ReleasePipeline';

const notYetReleasedLabel = getRequiredInput('notYetReleasedLabel');
const insidersReleasedLabel = getRequiredInput('insidersReleasedLabel');

class ReleasePipelineAction extends Action {
	id = 'ReleasePipeline';

	async onReopened(issue: OctoKitIssue) {
		await unenrollIssue(issue, notYetReleasedLabel, insidersReleasedLabel);
	}

	async onClosed(issue: OctoKitIssue) {
		await enrollIssue(issue, notYetReleasedLabel);
	}

	async onTriggered(github: OctoKit) {
		const query = `is:issue is:closed label:unreleased -label:insiders-released is:issue is:closed closed:2024-07-25..2024-08-22`;
		safeLog('Query:', query);
		for await (const page of github.query({ q: query })) {
			for (const issue of page) {
				await issue.removeLabel(notYetReleasedLabel);
				await issue.addLabel(insidersReleasedLabel);
			}
			// await new ReleasePipeline(github, notYetReleasedLabel, insidersReleasedLabel).run();
		}
	}

	async onCommented(issue: OctoKitIssue, comment: string) {
		if (comment.includes('closedWith')) {
			await enrollIssue(issue, notYetReleasedLabel);
		}
	}
}

new ReleasePipelineAction().run(); // eslint-disable-line
