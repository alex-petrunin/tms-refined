export type TestCaseID = string;

export class TestCase {
    constructor(
        public readonly id: TestCaseID,
        public summary: string,
        public description: string,
    ){}

}