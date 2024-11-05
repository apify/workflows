#!/bin/sh

owner=$1
repo=$2

if [ -z "$owner" -o -z "$repo" ]; then
    echo "Missing arguments - owner and repo" >&2
    exit 1
fi

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
    ] | add'
