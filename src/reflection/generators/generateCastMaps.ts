import fs from "fs";
import {CodeBuilder, DirBuilder} from "../builders";
import {connect} from "../../index.node";
import {Connection} from "../../ifaces";
import {StrictMap} from "../strictMap";
import {ConnectConfig} from "../../con_utils";
import {Casts, getCasts} from "../queries/getCasts";
import * as introspect from "../queries/getTypes";
import {genutil} from "../genutil";
import path from "path";
import {util} from "../util";
import {ScalarTypes} from "../queries/getScalars";

export type GeneratorParams = {
  dir: DirBuilder;
  types: introspect.Types;
  typesByName: Record<string, introspect.Type>;
  casts: Casts;
  scalars: ScalarTypes;
};

export const generateCastMaps = async (params: GeneratorParams) => {
  const {dir, types, typesByName, casts} = params;
  const {implicitCastMap} = casts;
  /////////////////////////////////////
  // generate implicit scalar mapping
  /////////////////////////////////////

  const f = dir.getPath("modules/__typeutil__.ts");
  const getScopedDisplayName = genutil.getScopedDisplayName(
    `${Math.random()}`,
    f
  );

  // generate minimal typescript cast
  const generateCastMap = (params: {
    typeList: introspect.Type[];
    casting: (id: string) => string[];
    file: CodeBuilder;
    mapName: string;
    baseCase?: string;
  }) => {
    const {typeList, casting, file, mapName, baseCase} = params;
    const scopedBaseCase = baseCase ? getScopedDisplayName(baseCase) : "";
    file.writeln(
      `export type ${mapName}<A${
        scopedBaseCase ? ` extends ${scopedBaseCase}` : ""
      }, B${scopedBaseCase ? ` extends ${scopedBaseCase}` : ""}> = `
    );
    file.indented(() => {
      for (const outer of typeList) {
        const outerCastableTo = casting(outer.id);
        file.writeln(`A extends ${getScopedDisplayName(outer.name)} ? `);
        file.indented(() => {
          for (const inner of typeList) {
            const innerCastableTo = casting(inner.id);

            const sameType = inner.name === outer.name;

            const aCastableToB = outerCastableTo.includes(inner.id);
            const bCastableToA = innerCastableTo.includes(outer.id);

            let sharedParent: string | null = null;
            const sharedParentId = outerCastableTo.find((t) =>
              innerCastableTo.includes(t)
            );
            if (sharedParentId) {
              const sharedParentName = types.get(sharedParentId).name;
              if (sharedParentName !== baseCase) {
                sharedParent = sharedParentName;
              }
            }

            const validCast =
              sameType || aCastableToB || bCastableToA || sharedParent;

            if (validCast) {
              file.writeln(`B extends ${getScopedDisplayName(inner.name)} ? `);

              if (sameType) {
                file.writeln(`B`);
              } else if (aCastableToB) {
                file.writeln(`B`);
              } else if (bCastableToA) {
                file.writeln(`A`);
              } else if (sharedParent) {
                file.writeln(getScopedDisplayName(sharedParent));
              } else {
                file.writeln(scopedBaseCase || "never");
              }
              file.writeln(`:`);
            }
          }
          file.writeln(scopedBaseCase || "never");
        });
        file.writeln(":");
      }
      file.writeln(scopedBaseCase || "never");
    });
  };

  const reverseTopo = Array.from(types)
    .reverse() // reverse topological order
    .map(([_, type]) => type);

  const materialScalars = reverseTopo.filter(
    (type) =>
      type.kind === "scalar" &&
      !type.is_abstract &&
      (!type.enum_values || !type.enum_values.length)
  );

  const userDefinedObjectTypes = reverseTopo.filter((type) => {
    if (type.kind !== "object") return false;
    if (type.name) if (type.name.includes("schema::")) return false;
    if (type.name.includes("sys::")) return false;
    if (type.name.includes("cfg::")) return false;
    if (type.name.includes("seq::")) return false;
    if (type.name.includes("stdgraphql::")) return false;
    if (
      !type.ancestors
        .map((t) => t.id)
        .includes(typesByName["std::Object"].id) &&
      type.name !== "std::Object"
    )
      return false;
    return true;
  });

  generateCastMap({
    typeList: materialScalars,
    // casting:
    casting: (id: string) => {
      const type = types.get(id);

      return util.deduplicate([
        ...util.getFromArrayMap(implicitCastMap, type.id),
      ]);
    },
    file: f,
    mapName: "getSharedParentScalar",
  });

  f.nl();

  generateCastMap({
    typeList: userDefinedObjectTypes,
    casting: (id: string) => {
      const type = types.get(id);
      return util.deduplicate([
        ...(type.kind === "object" ? type.ancestors.map((a) => a.id) : []),
      ]);
    },
    file: f,
    mapName: "getSharedParentObject",
    baseCase: "std::Object",
  });
};