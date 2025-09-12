// GOOD: 1 exported class, multiple private helper classes allowed

class PrivateHelper1 {
  constructor() {
    this.name = 'helper1';
  }
}

class PrivateHelper2 {
  constructor() {
    this.name = 'helper2';
  }
}

class AnotherPrivateClass {
  doSomething() {
    return 'private work';
  }
}

// Only one exported class - this should be allowed
export default class MainComponent {
  constructor() {
    this.helper1 = new PrivateHelper1();
    this.helper2 = new PrivateHelper2();
    this.worker = new AnotherPrivateClass();
  }
}