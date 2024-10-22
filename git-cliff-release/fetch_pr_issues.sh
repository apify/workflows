#!/bin/sh

owner=$(echo $GITHUB_REPO | cut -d / -f 1)
repo=$(echo $GITHUB_REPO | cut -d / -f 2)

gh api graphql --paginate --slurp \
    -F owner="$owner" \
    -F repo="$repo" \
    -f query='
        query ($owner: String!, $repo: String!, $endCursor: String) {
            repository(owner: $owner, name: $repo) {
                pullRequests(first: 100, after: $endCursor) {
                    nodes {
                        number,
                        closingIssuesReferences(last: 100) {
                            nodes { number }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
    ' | 
jq '
    [
        [.[] | .data.repository.pullRequests.nodes ] 
            | flatten[]
            | {
                (.number | tostring):
                [.closingIssuesReferences.nodes | .[] | .number]
            }
    ] | add' > pullRequestIssues.json
