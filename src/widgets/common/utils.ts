export const toArray = <T>(value: Array<{ key: string; name: string }> | undefined): T[] => {
    const result: T[] = [];
    value.forEach((v: T) => result.push(v));
    return result;
};

export const arrayFromString = <T>(value: string): T[] => {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};
