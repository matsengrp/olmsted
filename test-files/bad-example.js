// BAD: Multiple exported classes - this should trigger our custom rule

class PrivateHelper {
  constructor() {
    this.name = 'helper';
  }
}

// First exported class
export class FirstExport {
  constructor() {
    this.helper = new PrivateHelper();
  }
}

// Second exported class - this should cause an error
export default class SecondExport {
  constructor() {
    this.name = 'main';
  }
}