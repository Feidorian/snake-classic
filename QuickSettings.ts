
type StorageType<T> = T & {
	setItem(key: string, val: string | number | object): void;
	getItem(key: string): string | number | boolean | object | null;
	removeItem(key: string): void;
	clear(key: string): void;
};

/** Super class with properties that can be used to modify the state of elements in the DOM */
class DOMElement {
  private _id: string;
  private _title: string;

  constructor(id: string, title: string) {
    this._id = id;
    this._title = title;
  }
}

class Container extends DOMElement{}

class Label extends DOMElement{}

class Input extends DOMElement{}


class QuickSettings {
	private _panelZIndex = 1;
	private _storage: StorageType<object>;

	constructor(x: number, y: number, title: string, parent: HTMLElement, storage: StorageType<object> = localStorage) {
		this._storage = storage;
	}
}


const el = document.createElement('input')
