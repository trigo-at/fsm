node('linux') {
	stage('checkout source') {
		checkout scm
	}

	stage('lint') {
		sh 'make ci-lint'
	}

	stage('test') {
		sh 'make ci-test'
	}

	stage('Publish') {
		sh 'make publish'
	}
}
