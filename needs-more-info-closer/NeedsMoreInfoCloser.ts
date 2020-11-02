/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GitHub } from '../api/api'
import { daysAgoToHumanReadbleDate, daysAgoToTimestamp } from '../common/utils'

export class NeedsMoreInfoCloser {
	constructor(
		private github: GitHub,
		private label: string,
		private closeDays: number,
		private pingDays: number,
		private closeComment: string,
		private pingComment: string,
		private additionalTeam: string[],
	) {}

	async run() {
		const updatedTimestamp = daysAgoToHumanReadbleDate(this.closeDays)
		const pingTimestamp = daysAgoToTimestamp(this.pingDays)

		const query = `updated:<${updatedTimestamp} label:"${this.label}" is:open is:unlocked`

		for await (const page of this.github.query({ q: query })) {
			for (const issue of page) {
				const hydrated = await issue.getIssue()
				const lastCommentIterator = await issue.getComments(true).next()
				if (lastCommentIterator.done) {
					throw Error('Unexpected comment data')
				}
				const lastComment = lastCommentIterator.value[0]

				if (
					hydrated.open &&
					hydrated.labels.includes(this.label)
					// TODO: Verify updated timestamp
				) {
					if (
						!lastComment ||
						lastComment.author.isGitHubApp ||
						// TODO: List the collaborators once per go rather than checking a single user each issue
						this.additionalTeam.includes(lastComment.author.name) ||
						(await issue.hasWriteAccess(lastComment.author))
					) {
						if (lastComment) {
							console.log(
								`Last comment on ${hydrated.number} by ${lastComment.author.name}. Closing.`,
							)
						} else {
							console.log(`No comments on ${hydrated.number}. Closing.`)
						}
						if (this.closeComment) {
							await issue.postComment(this.closeComment)
						}
						await issue.closeIssue()
					} else {
						if (hydrated.updatedAt < pingTimestamp && hydrated.assignee) {
							console.log(
								`Last comment on ${hydrated.number} by ${lastComment.author.name}. Pinging @${hydrated.assignee}`,
							)
							if (this.pingComment) {
								await issue.postComment(
									this.pingComment
										.replace('${assignee}', hydrated.assignee)
										.replace('${author}', hydrated.author.name),
								)
							}
						} else {
							console.log(
								`Last comment on ${hydrated.number} by ${lastComment.author.name}. Skipping.${
									hydrated.assignee ? ' cc @' + hydrated.assignee : ''
								}`,
							)
						}
					}
				} else {
					console.log('Query returned an invalid issue:' + hydrated.number)
				}
			}
		}
	}
}
