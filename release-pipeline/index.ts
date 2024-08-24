/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OctoKit, OctoKitIssue } from '../api/octokit';
import { Action } from '../common/Action';
import { getRequiredInput } from '../common/utils';
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
		const query = `is:issue is:closed -label:unreleased -label:insiders-released closed:2024-08-17`;
		for await (const page of github.query({ q: query })) {
			for (const issue of page) {
				await enrollIssue(issue, notYetReleasedLabel);
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
