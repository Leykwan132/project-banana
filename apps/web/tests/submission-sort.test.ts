import { expect, test } from 'bun:test';
import { getNextSortDirection, sortSubmissions } from '../src/lib/submission-sort';

const submissions = [
    { id: 'older', status: 'Ready to post', created_at: 100, views: 50, earnings: 10 },
    { id: 'newer', status: 'Earning', created_at: 200, views: 500, earnings: 2 },
    { id: 'middle', status: 'Action required', created_at: 150, views: 100, earnings: 20 },
];

test('the first sort click is descending and the next click is ascending', () => {
    expect(getNextSortDirection(null, 'desc', 'views')).toBe('desc');
    expect(getNextSortDirection('views', 'desc', 'views')).toBe('asc');
    expect(getNextSortDirection('views', 'asc', 'views')).toBe('desc');
    expect(getNextSortDirection('views', 'asc', 'earnings')).toBe('desc');
});

test('sorts submitted dates from newest to oldest when descending', () => {
    expect(sortSubmissions(submissions, 'submitted', 'desc').map(item => item.id)).toEqual(['newer', 'middle', 'older']);
});

test('sorts numeric views from lowest to highest when ascending', () => {
    expect(sortSubmissions(submissions, 'views', 'asc').map(item => item.id)).toEqual(['older', 'middle', 'newer']);
});

test('sorts statuses by their displayed label', () => {
    expect(sortSubmissions(submissions, 'status', 'desc', status => status).map(item => item.id)).toEqual(['older', 'newer', 'middle']);
});
