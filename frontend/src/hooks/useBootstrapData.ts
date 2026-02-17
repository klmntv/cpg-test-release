/** @format */

import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { PackageGraph, QueryDescriptor } from '../api'

export type BootstrapState = {
	loading: boolean
	packageGraph: PackageGraph | null
	queries: QueryDescriptor[]
	error: string | null
	reload: () => Promise<void>
}

export function useBootstrapData(
	onError?: (message: string | null) => void,
): BootstrapState {
	const [loading, setLoading] = useState(true)
	const [packageGraph, setPackageGraph] = useState<PackageGraph | null>(null)
	const [queries, setQueries] = useState<QueryDescriptor[]>([])
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		const ac = new AbortController()
		setLoading(true)

		try {
			const [pkg, qs] = await Promise.all([
				api.getPackageGraph(ac.signal),
				api.getQueries(ac.signal),
			])
			setPackageGraph(pkg)
			setQueries(qs)
			setError(null)
			onError?.(null)
		} catch (err) {
			const message = (err as Error).message
			setError(message)
			onError?.(message)
		} finally {
			setLoading(false)
			ac.abort()
		}
	}, [onError])

	useEffect(() => {
		void load()
	}, [load])

	return {
		loading,
		packageGraph,
		queries,
		error,
		reload: load,
	}
}
