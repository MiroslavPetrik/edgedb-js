export enum StdScalar {
  int16,
  int32,
  int64,
  float32,
  float64,
  str,
  bytes,
  datetime,
  duration,
  local_datetime,
  local_date,
  local_time,
  uuid,
  bool,
}

export type StdScalarToJS<T extends StdScalar> = T extends
  | StdScalar.int16
  | StdScalar.int32
  | StdScalar.int64
  | StdScalar.float32
  | StdScalar.float64
  ? number
  : T extends StdScalar.str
  ? string
  : T extends StdScalar.bool
  ? boolean
  : T extends StdScalar.bytes
  ? Buffer
  : unknown;

export enum Kind {
  computable,
  property,
  link,
}

export enum Cardinality {
  at_most_one,
  one,
  many,
  at_least_one,
}

export interface SchemaObject {
  kind: Kind;
  name: string;
}

export interface Pointer extends SchemaObject {
  cardinality: Cardinality;
}

export interface Computable<T> extends SchemaObject {
  kind: Kind.computable;
  __type: T;
}

export interface Property<scalar extends StdScalar, C extends Cardinality>
  extends Pointer {
  kind: Kind.property;
  cardinality: C;
  name: string;
  type: scalar;
}

export interface Link<T, C extends Cardinality> extends Pointer {
  kind: Kind.link;
  cardinality: C;
  target: T;
  name: string;
}

export type Parameter<T extends StdScalar> = Computable<T> | Property<T, any>;

export type Expand<T> = T extends object
  ? T extends infer O
    ? {[K in keyof O]: Expand<O[K]>}
    : never
  : T;

type _UnpackBoolArg<Arg, T extends StdScalar> = Arg extends true
  ? StdScalarToJS<T>
  : Arg extends false
  ? undefined
  : Arg extends boolean
  ? StdScalarToJS<T> | undefined
  : Arg extends Property<infer PPT, any>
  ? StdScalarToJS<PPT>
  : StdScalarToJS<T>;

type _OnlyArgs<Args, T> = {
  [k in keyof Args]: k extends keyof T ? never : k;
}[keyof Args];

type _Result<Args, T> = {
  [k in (keyof T & keyof Args) | _OnlyArgs<Args, T>]: k extends keyof T
    ? T[k] extends Property<infer PPT, any>
      ? _UnpackBoolArg<Args[k], PPT>
      : T[k] extends Link<infer LLT, any>
      ? _Result<Args[k], LLT>
      : unknown
    : Args[k] extends Computable<infer CT>
    ? CT
    : never;
};

export type Result<Args, T> = Expand<_Result<Args, T>>;

export type MakeSelectArgs<T> = {
  [k in keyof T]?: T[k] extends Link<infer LT, infer LC>
    ? Link<LT, LC> | MakeSelectArgs<LT> | Computable<LT> | boolean
    : T[k] extends Property<infer PT, infer PC>
    ? Property<PT, PC> | Computable<PT> | boolean
    : never;
};

function literal<T extends number | string | boolean | Date>(
  x: T
): Computable<T> {
  return {kind: "computable", args: [x]} as any;
}

const std = {
  ops: {
    plus: <T>(l: Parameter<T>, r: Parameter<T>): Computable<T> => {
      return {kind: "computable", args: [l, r], op: "plus"} as any;
    },
  } as const,
  len: <T>(l: Parameter<T>): Computable<number> => {
    return {kind: "computable", args: [l]} as any;
  },
} as const;

const bases = {
  User: {
    // will be auto-generated

    get name() {
      return {
        kind: Kind.property,
        name: "name",
        cardinality: Cardinality.one,
        type: StdScalar.str,
      } as Property<StdScalar.str, Cardinality.one>;
    },

    get email() {
      return {
        kind: Kind.property,
        name: "email",
        cardinality: Cardinality.one,
        type: StdScalar.str,
      } as Property<StdScalar.str, Cardinality.one>;
    },

    get age() {
      return {
        kind: Kind.property,
        name: "age",
        cardinality: Cardinality.one,
        type: StdScalar.int64,
      } as Property<StdScalar.int64, Cardinality.one>;
    },

    get friends() {
      return {
        kind: Kind.link,
        cardinality: Cardinality.many,
        name: "friends",
        target: bases.User,
      } as Link<typeof bases.User, Cardinality.many>;
    },

    get preferences() {
      return {
        kind: Kind.link,
        cardinality: Cardinality.at_most_one,
        name: "preferences",
        target: bases.Preferences,
      } as Link<typeof bases.Preferences, Cardinality.at_most_one>;
    },
  } as const,

  Preferences: {
    // will be auto-generated

    get name() {
      return {
        kind: Kind.property,
        name: "name",
        cardinality: Cardinality.one,
        type: StdScalar.str,
      } as Property<StdScalar.str, Cardinality.one>;
    },

    get emailNotifications() {
      return {
        name: "emailNotifications",
        kind: Kind.property,
        cardinality: Cardinality.one,
        type: StdScalar.str,
      } as Property<StdScalar.str, Cardinality.one>;
    },

    get saveOnClose() {
      return {
        name: "saveOnClose",
        kind: Kind.property,
        cardinality: Cardinality.at_most_one,
        type: StdScalar.str,
      } as Property<StdScalar.str, Cardinality.at_most_one>;
    },
  } as const,
};

const User = {
  ...bases.User,

  shape: <Spec extends MakeSelectArgs<typeof bases.User>>(
    spec: Spec
  ): Query<Result<Spec, typeof bases.User>> => {
    throw new Error("not implemented");
  },
} as const;

const Preferences = {
  ...bases.Preferences,

  shape: <Spec extends MakeSelectArgs<typeof bases.Preferences>>(
    spec: Spec
  ): Query<Result<Spec, typeof bases.Preferences>> => {
    throw new Error("not implemented");
  },
} as const;

////////////////

class Query<T> {
  _type!: T;

  filter(): Query<T> {
    return null as any;
  }
}

////////////////

const results2 = User.shape({
  email: User.email,
  age: false,
  name: 1 > 0,
  friends: {
    name: true,
    age: 1 > 0,
    friends: {
      zzz: std.len(User.name),
      zzz2: literal(42),
      friends: {
        age: true,
      },
    },
  },
});

/////////////

// type zzz<A1 = number, A2 = Array<[number, string]>> = {
//   key: A1;
//   key2: A2;
//   0: A1;
//   1: A2;
// };

// const f: zzz = (null as any) as zzz;

// const a = f.key2;

//////////////////////

// type NR<T extends object> = {[k in keyof T]: T[k] | undefined};

// function namedtuple<T extends object, R = Expand<NR<T>>>(P: T): R {
//   throw new Error("aaa");
// }

// const a = namedtuple({a: 1, b: "222"});

// ////////////////

// const inp = {a: 1, b: "aaa", z: new Date(), k: "aaaaa"};
// type input = typeof inp;

// type eee1 = keyof input;

// type Widen<T> = T extends boolean
//   ? boolean
//   : T extends string
//   ? string
//   : T extends number
//   ? number
//   : T;

// type TTTT<T, Z extends string[]> =
//   | {
//       [k in keyof Z]: Widen<T[Z[k] & keyof T]>;
//     }
//   | {[k in keyof T]: Widen<T[k]>};

// type R = TTTT<input, ["a", "b", "z", "k"]>;

// ////////

// type TupleFromUnion<T, S = any> = T extends S | any ? S : T;

// type aa = TupleFromUnion<"aaa" | "bbb">;

// // type RR = TTTT<input, TupleFromUnion<keyof input>;