export const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
        return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
};
