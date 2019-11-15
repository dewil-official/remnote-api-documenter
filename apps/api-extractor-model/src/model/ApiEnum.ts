// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { DeclarationReference, Meaning, Navigation, Component } from '@microsoft/tsdoc/lib/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem, IApiDeclaredItemOptions } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin, IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { ApiItemContainerMixin, IApiItemContainerMixinOptions } from '../mixins/ApiItemContainerMixin';
import { ApiEnumMember } from './ApiEnumMember';
import { IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';

/**
 * Constructor options for {@link ApiEnum}.
 * @public
 */
export interface IApiEnumOptions extends
  IApiItemContainerMixinOptions,
  IApiNameMixinOptions,
  IApiReleaseTagMixinOptions,
  IApiDeclaredItemOptions {
}

/**
 * Represents a TypeScript enum declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEnum` represents an enum declaration such as `FontSizes` in the example below:
 *
 * ```ts
 * export enum FontSizes {
 *   Small = 100,
 *   Medium = 200,
 *   Large = 300
 * }
 * ```
 *
 * @public
 */
export class ApiEnum extends ApiItemContainerMixin(ApiNameMixin(ApiReleaseTagMixin(ApiDeclaredItem))) {

  public constructor(options: IApiEnumOptions) {
    super(options);
  }

  public static getContainerKey(name: string): string {
    return `${name}|${ApiItemKind.Enum}`;
  }

  /** @override */
  public get kind(): ApiItemKind {
    return ApiItemKind.Enum;
  }

  /** @override */
  public get members(): ReadonlyArray<ApiEnumMember> {
    return super.members as ReadonlyArray<ApiEnumMember>;
  }

  /** @override */
  public get containerKey(): string {
    return ApiEnum.getContainerKey(this.name);
  }

  /** @override */
  public addMember(member: ApiEnumMember): void {
    if (member.kind !== ApiItemKind.EnumMember) {
      throw new Error('Only ApiEnumMember objects can be added to an ApiEnum');
    }
    super.addMember(member);
  }

  /** @beta @override */
  public buildCanonicalReference(): DeclarationReference {
    const nameComponent: Component = DeclarationReference.parseComponent(this.name);
    return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
      .addNavigationStep(Navigation.Exports, nameComponent)
      .withMeaning(Meaning.Enum);
  }
}
