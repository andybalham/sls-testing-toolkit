export default class TestObservation {
  //
  observerId: string;

  timestamp: number;

  data: Record<string, any>;

  static getCountById(observations: TestObservation[], observerId: string): number {
    return TestObservation.filterById(observations, observerId).length;
  }

  static filterById(observations: TestObservation[], observerId: string): TestObservation[] {
    return observations.filter((o) => o.observerId === observerId);
  }

  static consoleLog(observations: TestObservation[]): void {
    observations.forEach((observation) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ o: observation }, null, 2));
    });
  }
}
