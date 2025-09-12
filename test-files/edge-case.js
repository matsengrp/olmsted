// EDGE CASE: Multiple named exports - this should trigger our rule

class PrivateHelper {
  constructor() {
    this.name = 'helper';
  }
}

// First named export
export class UtilityClass {
  static doWork() {
    return 'working';
  }
}

// Second named export - this should cause an error
export class AnotherUtility {
  static doOtherWork() {
    return 'other work';
  }
}