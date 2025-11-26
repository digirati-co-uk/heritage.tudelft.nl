"use client";

import { LanguageProvider } from "react-iiif-vault";
import { Hits, Pagination, SearchBox } from "react-instantsearch";
import { FacetList } from "../search/FacetList";
import { SearchHit } from "../search/SearchHit";
import { SearchTabs } from "../search/SearchTabs";
import { SearchWrapper, getFacets } from "../search/SearchWrapper";

export function SearchPage({ title, locale }: { title: string; locale: string }) {
  return (
    <LanguageProvider language={locale}>
      <div>
        <h1 className="mb-4 mt-6 text-3xl font-medium leading-tight text-gray-900">{title}</h1>

        <SearchWrapper routing>
          <SearchBox
            classNames={{
              root: "py-2",
              form: "flex bg-white gap-1",
              input:
                "flex-1 w-full px-2 py-2 text-lg bg-white border border-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-blue-500 focus:ring-1",
              submit:
                "flex px-4 bg-white hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500",
              submitIcon: "w-full h-4 m-auto",
              reset:
                "flex px-4 bg-white hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500",
              resetIcon: "w-5 h-3 m-auto",
            }}
          />

          <SearchTabs />

          <div className="gap-4 md:flex">
            <div className="flex-1">
              <Hits hitComponent={SearchHit} />
              <Pagination
                classNames={{
                  root: "py-5",
                  list: "flex gap-2 justify-center mt-4",
                  item: "rounded-lg bg-slate-400 text-slate-100 hover:bg-slate-500",
                  link: "block px-3 py-1",
                  selectedItem: "bg-slate-600",
                  disabledItem: "opacity-50 cursor-not-allowed",
                }}
              />
            </div>
            <div className="w-full md:w-1/4">
              {getFacets().map((facet) => {
                return <FacetList key={facet} facet={facet} />;
              })}
            </div>
          </div>
        </SearchWrapper>
      </div>
    </LanguageProvider>
  );
}
